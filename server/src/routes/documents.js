import { Router } from 'express';
import multer from 'multer';
import Document from '../models/Document.js';
import Chunk from '../models/Chunk.js';
import Chat from '../models/Chat.js';
import { requireAuth } from '../middleware/auth.js';
import { wrap } from '../middleware/error.js';
import { processDocument, summarize } from '../services/documents.js';
import { retrieve, getContext } from '../services/rag.js';
import { complete, completeJSON } from '../services/llm.js';

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(pdf|docx|txt|md)$/i.test(file.originalname);
    cb(ok ? null : new Error('Unsupported file type'), ok);
  },
});

// Load a document the current user owns, or 404.
async function owned(req, res) {
  const doc = await Document.findOne({ _id: req.params.id, user: req.userId });
  if (!doc) res.status(404).json({ error: 'Document not found' });
  else if (doc.status !== 'ready' && !req.skipReady) {
    res.status(409).json({ error: doc.status === 'failed' ? `Processing failed: ${doc.error}` : 'Document is still processing' });
    return null;
  }
  return doc || null;
}

router.post('/', upload.single('file'), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose a PDF, DOCX, TXT or MD file to upload' });
  const doc = await Document.create({
    user: req.userId,
    title: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
  });
  processDocument(doc._id, req.file.buffer, req.file.mimetype, req.file.originalname); // fire and forget
  res.status(202).json(doc);
}));

router.get('/', wrap(async (req, res) => {
  res.json(await Document.find({ user: req.userId }).sort('-createdAt').select('-summaries'));
}));

router.get('/:id', wrap(async (req, res) => {
  req.skipReady = true;
  const doc = await owned(req, res);
  if (doc) res.json(doc);
}));

router.delete('/:id', wrap(async (req, res) => {
  req.skipReady = true;
  const doc = await owned(req, res);
  if (!doc) return;
  await Promise.all([Chunk.deleteMany({ document: doc._id }), Chat.deleteMany({ document: doc._id }), doc.deleteOne()]);
  res.json({ ok: true });
}));

/* ---------- Q&A (RAG) ---------- */
router.get('/:id/chat', wrap(async (req, res) => {
  const chat = await Chat.findOne({ user: req.userId, document: req.params.id });
  res.json(chat?.messages || []);
}));

router.delete('/:id/chat', wrap(async (req, res) => {
  await Chat.deleteOne({ user: req.userId, document: req.params.id });
  res.json({ ok: true });
}));

router.post('/:id/chat', wrap(async (req, res) => {
  const doc = await owned(req, res);
  if (!doc) return;
  const question = (req.body.question || '').trim();
  if (!question) return res.status(400).json({ error: 'Ask a question' });

  const chat = (await Chat.findOne({ user: req.userId, document: doc._id })) ||
    new Chat({ user: req.userId, document: doc._id, messages: [] });
  const history = chat.messages.slice(-6);

  // Short follow-ups ("what about the second one?") retrieve poorly alone, so borrow the prior question.
  const lastUser = [...history].reverse().find((m) => m.role === 'user');
  const query = question.split(/\s+/).length < 8 && lastUser ? `${lastUser.content} ${question}` : question;

  const hits = await retrieve({ userId: req.userId, documentId: doc._id, query, k: 6 });
  const context = hits.map((h, i) => `[${i + 1}] ${h.text}`).join('\n\n');

  const answer = await complete({
    system:
      'You answer questions about a document using ONLY the numbered excerpts provided. ' +
      'Cite the excerpts you rely on with bracketed numbers like [1] or [2][3]. ' +
      'If the excerpts do not contain the answer, say you could not find it in the document. Be concise and accurate.',
    maxTokens: 1200,
    messages: [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: `Excerpts:\n${context || '(no relevant excerpts found)'}\n\nQuestion: ${question}` },
    ],
  });

  const sources = hits.map((h, i) => ({ n: i + 1, index: h.index, text: h.text, score: +h.score.toFixed(3) }));
  chat.messages.push({ role: 'user', content: question });
  chat.messages.push({ role: 'assistant', content: answer, sources });
  await chat.save();
  res.json({ answer, sources });
}));

/* ---------- Summary ---------- */
router.post('/:id/summarize', wrap(async (req, res) => {
  const doc = await owned(req, res);
  if (!doc) return;
  const style = ['brief', 'detailed', 'bullets'].includes(req.body.style) ? req.body.style : 'brief';
  let summary = doc.summaries.get(style);
  if (!summary || req.body.refresh) {
    summary = await summarize(doc._id, style);
    doc.summaries.set(style, summary);
    await doc.save();
  }
  res.json({ style, summary });
}));

/* ---------- Information extraction ---------- */
router.post('/:id/extract', wrap(async (req, res) => {
  const doc = await owned(req, res);
  if (!doc) return;
  const custom = Array.isArray(req.body.fields) ? req.body.fields.filter(Boolean).slice(0, 15) : [];
  const text = await getContext(doc._id, 60000);
  const shape = custom.length
    ? `{ ${custom.map((f) => `"${f}": "value, or null if not stated"`).join(', ')} }`
    : `{ "document_type": string, "people": string[], "organizations": string[], "dates": string[], "locations": string[], "amounts": string[], "key_facts": string[], "action_items": string[] }`;
  const data = await completeJSON({
    system: 'You extract structured information from documents. Use only what the text states; never guess.',
    prompt: `Extract information from the document below as JSON in exactly this shape:\n${shape}\n\nDocument:\n${text}`,
    maxTokens: 2500,
  });
  res.json(data);
}));

/* ---------- Study material ---------- */
router.post('/:id/study', wrap(async (req, res) => {
  const doc = await owned(req, res);
  if (!doc) return;
  const { type = 'flashcards' } = req.body;
  const count = Math.min(Math.max(parseInt(req.body.count) || 10, 3), 25);
  const text = await getContext(doc._id, 60000);

  if (type === 'notes') {
    const notes = await complete({
      system: 'You write clear study notes from source material. Use only the provided text.',
      maxTokens: 2500,
      messages: [{ role: 'user', content: `Create structured study notes in markdown: headings, key terms in bold, concise bullets, and a short "Review questions" list at the end.\n\n${text}` }],
    });
    return res.json({ type, notes });
  }
  if (type === 'quiz') {
    const quiz = await completeJSON({
      system: 'You write fair multiple-choice questions grounded strictly in the source text.',
      prompt: `Write ${count} multiple-choice questions. JSON shape: { "questions": [ { "question": string, "options": [4 strings], "answer": 0-3 index of the correct option, "explanation": string } ] }\n\n${text}`,
      maxTokens: 4000,
    });
    return res.json({ type, ...quiz });
  }
  const cards = await completeJSON({
    system: 'You write effective flashcards grounded strictly in the source text.',
    prompt: `Write ${count} flashcards. JSON shape: { "cards": [ { "front": string, "back": string } ] }\n\n${text}`,
    maxTokens: 3000,
  });
  res.json({ type: 'flashcards', ...cards });
}));

export default router;
