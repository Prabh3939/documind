import { Router } from 'express';
import User from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { wrap } from '../middleware/error.js';

const router = Router();

router.post('/register', wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6)
    return res.status(400).json({ error: 'Name, email and a password of 6+ characters are required' });
  if (await User.findOne({ email })) return res.status(409).json({ error: 'That email is already registered' });
  const user = await User.create({ name, email, password });
  res.status(201).json({ token: signToken(user._id), user: { id: user._id, name: user.name, email: user.email } });
}));

router.post('/login', wrap(async (req, res) => {
  const user = await User.findOne({ email: req.body.email?.toLowerCase() }).select('+password');
  if (!user || !(await user.matches(req.body.password || '')))
    return res.status(401).json({ error: 'Incorrect email or password' });
  res.json({ token: signToken(user._id), user: { id: user._id, name: user.name, email: user.email } });
}));

export default router;
