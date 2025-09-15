import express from 'express';
import Todo from '../models/Todo.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
	const todos = await Todo.find({ userId: req.user.id }).sort({ order: 1, createdAt: 1 });
	res.json(todos.map((t) => t.toJSON()));
});

router.post('/', async (req, res) => {
	const { text, status = 'todo', completed = false, order = 0, createdAt } = req.body;
	if (!text) return res.status(400).json({ message: 'Text required' });
	const todo = await Todo.create({
		userId: req.user.id,
		text,
		status,
		completed,
		order,
		createdAtIso: createdAt,
	});
	res.status(201).json(todo.toJSON());
});

router.put('/:id', async (req, res) => {
	const { id } = req.params;
	const update = req.body || {};
	const todo = await Todo.findOneAndUpdate({ _id: id, userId: req.user.id }, update, { new: true });
	if (!todo) return res.status(404).json({ message: 'Not found' });
	res.json(todo.toJSON());
});

router.delete('/:id', async (req, res) => {
	const { id } = req.params;
	const result = await Todo.deleteOne({ _id: id, userId: req.user.id });
	if (result.deletedCount === 0) return res.status(404).json({ message: 'Not found' });
	res.json({ message: 'Deleted' });
});

router.post('/reorder', async (req, res) => {
	const { items } = req.body; // [{id, status, order}]
	if (!Array.isArray(items)) return res.status(400).json({ message: 'Invalid payload' });
	const ops = items.map((i) => ({
		updateOne: {
			filter: { _id: i.id, userId: req.user.id },
			update: { status: i.status, order: i.order },
		},
	}));
	if (ops.length) await Todo.bulkWrite(ops, { ordered: false });
	res.json({ message: 'Reordered' });
});

export default router;
