import pdf from 'pdf-parse/lib/pdf-parse.js'; // direct path avoids pdf-parse's debug-mode bug under ESM
import mammoth from 'mammoth';

export async function extractText(buffer, mimeType = '', name = '') {
  const lower = name.toLowerCase();
  if (mimeType === 'application/pdf' || lower.endsWith('.pdf')) {
    const data = await pdf(buffer);
    return clean(data.text);
  }
  if (lower.endsWith('.docx') || mimeType.includes('officedocument.wordprocessingml')) {
    const { value } = await mammoth.extractRawText({ buffer });
    return clean(value);
  }
  return clean(buffer.toString('utf-8')); // .txt / .md
}

const clean = (t) =>
  t
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
