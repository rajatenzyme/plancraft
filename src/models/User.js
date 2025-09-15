import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		email: { type: String, required: true, unique: true, lowercase: true, index: true },
		passwordHash: { type: String, required: true },
	},
	{ timestamps: true }
);

userSchema.set('toJSON', {
	transform: (_doc, ret) => {
		ret.id = ret._id.toString();
		delete ret._id;
		delete ret.__v;
		delete ret.passwordHash;
		return ret;
	},
});

export default mongoose.model('User', userSchema);
