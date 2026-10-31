import Chunk from '../models/Chunk.js';
import { embed } from './embeddings.js';

const dot = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s; // vectors are normalised, so dot product == cosine similarity
};

/** Semantic retrieval. Scoped to one document, or across all of a user's documents. */
export async function retrieve({ userId, documentId, query, k = 6, minScore = 0.15 }) {
  const [qv] = await embed([query]);
  const filter = { user: userId };
  if (documentId) filter.document = documentId;
  const chunks = await Chunk.find(filter).select('document index text embedding').populate('document', 'title').lean();
  return chunks
    .map((c) => ({
      document: c.document?._id,
      title: c.document?.title,
      index: c.index,
      text: c.text,
      score: dot(qv, c.embedding),
    }))
    .filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

/** Full text if it fits, otherwise evenly spaced chunks so the whole document is represented. */
export async function getContext(documentId, maxChars = 60000) {
  const chunks = await Chunk.find({ document: documentId }).sort('index').select('text').lean();
  const total = chunks.reduce((n, c) => n + c.text.length, 0);
  if (total <= maxChars) return chunks.map((c) => c.text).join('\n\n');
  const keep = Math.max(1, Math.floor(maxChars / (total / chunks.length)));
  const step = chunks.length / keep;
  return Array.from({ length: keep }, (_, i) => chunks[Math.floor(i * step)].text).join('\n\n[...]\n\n');
}
