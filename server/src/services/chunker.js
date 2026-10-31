// Paragraph-aware chunking with character overlap so answers spanning a boundary aren't lost.
export function chunkText(text, { size = 900, overlap = 150 } = {}) {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let current = '';

  const push = () => {
    if (current.trim()) chunks.push(current.trim());
  };

  for (const para of paragraphs) {
    // Break oversized paragraphs on sentence boundaries
    const parts = para.length > size ? para.match(/[^.!?\n]+[.!?]*\s*/g) || [para] : [para];
    for (const part of parts) {
      if ((current + ' ' + part).length > size && current) {
        push();
        current = current.slice(-overlap) + ' ' + part;
      } else {
        current = current ? current + (parts.length > 1 ? '' : '\n\n') + part : part;
      }
    }
  }
  push();
  return chunks;
}
