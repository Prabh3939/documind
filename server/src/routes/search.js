import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { wrap } from '../middleware/error.js';
import { retrieve } from '../services/rag.js';

const router = Router();
router.use(requireAuth);

// Semantic search across every document the user owns.
router.post('/', wrap(async (req, res) => {
  const query = (req.body.query || '').trim();
  if (!query) return res.status(400).json({ error: 'Enter something to search for' });
  const results = await retrieve({ userId: req.userId, query, k: Math.min(req.body.k || 10, 25), minScore: 0.2 });
  res.json(results.map((r) => ({ ...r, score: +r.score.toFixed(3) })));
}));

export default router;
