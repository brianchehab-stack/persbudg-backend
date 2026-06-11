import mongoose from 'mongoose';

const BudgetSchema = new mongoose.Schema(
	{
		ownerId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true
		},
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true
		},
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			index: true
		},
		ownerUsername: {
			type: String,
			trim: true,
			lowercase: true,
			index: true,
			default: null
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
		month: {
			type: String,
			trim: true,
			index: true,
			default: null
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

BudgetSchema.index({ ownerId: 1, month: 1, category: 1 });

BudgetSchema.pre('validate', function syncLegacyUserFields() {
	if (this.ownerId && !this.user) {
		this.user = this.ownerId;
	}

	if (this.ownerId && !this.userId) {
		this.userId = this.ownerId;
	}

	if (!this.ownerId && this.user) {
		this.ownerId = this.user;
	}

	if (!this.ownerId && this.userId) {
		this.ownerId = this.userId;
	}

	if (this.user && !this.userId) {
		this.userId = this.user;
	}

	if (!this.user && this.userId) {
		this.user = this.userId;
	}

	const sourceDate = this.startDate ? new Date(this.startDate) : new Date();
	if (!Number.isNaN(sourceDate.getTime())) {
		const monthValue = `${sourceDate.getUTCFullYear()}-${String(sourceDate.getUTCMonth() + 1).padStart(2, '0')}`;
		this.month = monthValue;
	}
});

export default mongoose.model('Budget', BudgetSchema);
