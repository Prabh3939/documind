import { pipeline } from '@xenova/transformers';

// Local sentence-transformer (384-d). Runs in Node, no API key, model cached after first download.
let extractor;
const getExtractor = async () => (extractor ??= await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2'));

export async function embed(texts) {
  const ex = await getExtractor();
  const out = [];
  for (const t of texts) {
    const r = await ex(t.slice(0, 2000), { pooling: 'mean', normalize: true });
    out.push(Array.from(r.data));
  }
  return out;
}
