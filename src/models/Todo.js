import mongoose from 'mongoose';

const todoSchema = new mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		text: { type: String, required: true, trim: true },
		completed: { type: Boolean, default: false },
		status: { type: String, enum: ['todo', 'progress', 'done'], default: 'todo' },
		order: { type: Number, default: 0 },
		createdAtIso: { type: String },
	},
	{ timestamps: true }
);

todoSchema.set('toJSON', {
	transform: (_doc, ret) => {
		ret.id = ret._id.toString();
		delete ret._id;
		delete ret.__v;
		ret.userId = ret.userId.toString();
		return ret;
	},
});

export default mongoose.model('Todo', todoSchema);
