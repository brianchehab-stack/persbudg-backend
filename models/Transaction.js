import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema(
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

TransactionSchema.index({ ownerId: 1, date: -1 });

TransactionSchema.pre('validate', function syncLegacyUserFields() {
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
});

export default mongoose.model('Transaction', TransactionSchema);
