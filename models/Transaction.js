import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true
		},
		budget: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Budget'
		},
		type: {
			type: String,
			enum: ['income', 'expense'],
			required: true
		},
		category: {
			type: String,
			required: true,
			trim: true
		},
		amount: {
			type: Number,
			required: true,
			min: 0
		},
		description: {
			type: String,
			trim: true,
			default: ''
		},
		date: {
			type: Date,
			default: Date.now
		}
	},
	{
		timestamps: true
	}
);

export default mongoose.model('Transaction', TransactionSchema);
