import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { requireAuth, setAuthCookie, clearAuthCookie } from '../middleware/auth.js';

const router = express.Router();

router.post('/signup', async (req, res) => {
	try {
		const { name, email, password } = req.body;
		if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });
		const existing = await User.findOne({ email });
		if (existing) return res.status(409).json({ message: 'Email already in use' });
		const passwordHash = await bcrypt.hash(password, 12);
		const user = await User.create({ name, email, passwordHash });
		setAuthCookie(res, user.id);
		return res.status(201).json(user.toJSON());
	} catch (err) {
		return res.status(500).json({ message: 'Signup failed' });
	}
});

router.post('/login', async (req, res) => {
	try {
		const { email, password } = req.body;
		const user = await User.findOne({ email });
		if (!user) return res.status(401).json({ message: 'Invalid credentials' });
		const ok = await bcrypt.compare(password, user.passwordHash);
		if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
		setAuthCookie(res, user.id);
		return res.json(user.toJSON());
	} catch (err) {
		return res.status(500).json({ message: 'Login failed' });
	}
});

router.post('/logout', (_req, res) => {
	clearAuthCookie(res);
	return res.json({ message: 'Logged out' });
});

router.get('/me', requireAuth, async (req, res) => {
	const user = await User.findById(req.user.id);
	if (!user) return res.status(401).json({ message: 'Unauthorized' });
	return res.json(user.toJSON());
});

export default router;
