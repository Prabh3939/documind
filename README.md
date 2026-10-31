# DocuMind

AI-powered document intelligence platform built on the MERN stack. Upload a document, then ask cited questions, summarise it, extract structured data, and generate study material.

## Architecture

```
React (Vite)  --/api-->  Express  -->  MongoDB (users, documents, chunks + vectors, chats)
                            |
                            +--> Parser (pdf-parse / mammoth)  -> Chunker -> Local embeddings (MiniLM, 384-d)
                            +--> Retriever (cosine similarity)  -> Claude (answers, summaries, extraction, study)
```

**Ingestion:** upload -> extract text -> split into ~900-char overlapping chunks -> embed each chunk locally -> store in MongoDB. Runs in the background; the UI polls until the document is `Ready`.

**Question answering (RAG):** embed the question -> retrieve top 6 chunks by cosine similarity -> Claude answers using only those excerpts and cites them as `[1]`, `[2]`. Clicking a citation shows the exact source passage.

**Other features:** map-reduce summaries for long documents (cached per style), JSON extraction (default entities or custom fields), flashcards / quiz / study notes, and semantic search across the whole library.

## Setup

Requirements: Node 18+, MongoDB running locally (or an Atlas URI), an Anthropic API key.

```bash
# 1. Server
cd server
cp .env.example .env      # fill in ANTHROPIC_API_KEY and JWT_SECRET
npm install
npm run dev               # http://localhost:5000

# 2. Client (new terminal)
cd client
npm install
npm run dev               # http://localhost:5173
```

The first upload downloads the embedding model (about 25 MB) once; later runs use the cache.

## API

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Sign up / sign in (JWT) |
| POST | `/api/documents` | Upload (multipart `file`) |
| GET | `/api/documents`, `/api/documents/:id` | List / fetch |
| DELETE | `/api/documents/:id` | Delete document, chunks, chat |
| GET / POST / DELETE | `/api/documents/:id/chat` | History / ask / clear |
| POST | `/api/documents/:id/summarize` | `{ style: brief|detailed|bullets }` |
| POST | `/api/documents/:id/extract` | `{ fields?: string[] }` |
| POST | `/api/documents/:id/study` | `{ type: flashcards|quiz|notes, count }` |
| POST | `/api/search` | `{ query }` semantic search across all documents |

## Scaling notes

- Retrieval currently scores chunks in Node, which is fine for personal libraries (thousands of chunks). For larger corpora, create an **Atlas Vector Search** index on `chunks.embedding` (384 dims, cosine) and replace the scoring loop in `server/src/services/rag.js` with a `$vectorSearch` aggregation.
- Replace the fire-and-forget ingestion in `routes/documents.js` with a queue (BullMQ) if you need retries or many concurrent uploads.
- Scanned PDFs have no text layer and are rejected with a clear message; add OCR (Tesseract) to support them.
- Move the JWT from localStorage to an httpOnly cookie for production.
