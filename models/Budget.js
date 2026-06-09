import mongoose from 'mongoose';

const BudgetSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true
		},
		name: {
			type: String,
			required: true,
			trim: true
		},
		category: {
			type: String,
			trim: true,
			default: 'General'
		},
		amount: {
			type: Number,
			required: true,
			min: 0
		},
		period: {
			type: String,
			enum: ['weekly', 'monthly', 'yearly', 'custom'],
			default: 'monthly'
		},
		startDate: {
			type: Date,
			default: Date.now
		},
		endDate: {
			type: Date
		},
		notes: {
			type: String,
			trim: true,
			default: ''
		}
	},
	{
		timestamps: true
	}
);

export default mongoose.model('Budget', BudgetSchema);
