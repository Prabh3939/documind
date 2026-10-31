import Document from '../models/Document.js';
import Chunk from '../models/Chunk.js';
import { extractText } from './parser.js';
import { chunkText } from './chunker.js';
import { embed } from './embeddings.js';
import { complete } from './llm.js';
import { getContext } from './rag.js';

/** Background ingestion: parse -> chunk -> embed -> store. */
export async function processDocument(docId, buffer, mimeType, name) {
  try {
    const doc = await Document.findById(docId);
    const text = await extractText(buffer, mimeType, name);
    if (!text) throw new Error('No readable text found. Scanned PDFs need OCR first.');
    const pieces = chunkText(text);
    const vectors = await embed(pieces);
    await Chunk.insertMany(
      pieces.map((t, i) => ({ user: doc.user, document: doc._id, index: i, text: t, embedding: vectors[i] }))
    );
    doc.text = text;
    doc.chunkCount = pieces.length;
    doc.wordCount = text.split(/\s+/).length;
    doc.status = 'ready';
    await doc.save();
  } catch (err) {
    console.error('Ingestion failed:', err.message);
    await Document.findByIdAndUpdate(docId, { status: 'failed', error: err.message });
  }
}

const STYLES = {
  brief: 'a brief summary of 3-4 sentences',
  detailed: 'a detailed, well-structured summary with short markdown headings for each major section',
  bullets: 'a bullet-point summary of the key points, grouped under short markdown headings',
};

/** Map-reduce summarisation so long documents don't overflow the context window. */
export async function summarize(docId, style = 'brief') {
  const instruction = STYLES[style] || STYLES.brief;
  const system = 'You are a precise document summariser. Use only the provided text. Do not invent facts.';
  const chunks = await Chunk.find({ document: docId }).sort('index').select('text').lean();
  const full = chunks.map((c) => c.text).join('\n\n');

  if (full.length <= 40000) {
    return complete({ system, maxTokens: 1800, messages: [{ role: 'user', content: `Write ${instruction} of this document.\n\n${full}` }] });
  }
  const segments = [];
  for (let i = 0; i < full.length; i += 20000) segments.push(full.slice(i, i + 20000));
  const partials = await Promise.all(
    segments.map((s) =>
      complete({ system, maxTokens: 700, messages: [{ role: 'user', content: `Summarise the key points of this section in under 250 words.\n\n${s}` }] })
    )
  );
  return complete({
    system,
    maxTokens: 1800,
    messages: [{ role: 'user', content: `These are summaries of consecutive sections of one document. Write ${instruction} of the whole document.\n\n${partials.join('\n\n---\n\n')}` }],
  });
}

export { getContext };
