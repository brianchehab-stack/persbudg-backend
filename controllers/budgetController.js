import mongoose from 'mongoose';

import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const buildOwnershipFilter = (userId) => ({
	$or: [{ user: userId }, { userId }]
});

const migrateLegacyBudgetOwnership = async (userId) => {
	await Budget.collection.updateMany(
		{ user: { $exists: false }, userId },
		{ $set: { user: userId } }
	);
};

const buildPagination = (query) => {
	const page = Math.max(parseInt(query.page || '1', 10), 1);
	const limit = Math.min(Math.max(parseInt(query.limit || '10', 10), 1), 100);
	const skip = (page - 1) * limit;

	return { page, limit, skip };
};

const listBudgets = async (req, res) => {
	await migrateLegacyBudgetOwnership(req.user._id);

	const { page, limit, skip } = buildPagination(req.query);
	const filter = buildOwnershipFilter(req.user._id);
	const [budgets, total] = await Promise.all([
		Budget.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
		Budget.countDocuments(filter)
	]);

	return res.json({
		items: budgets,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.max(Math.ceil(total / limit), 1)
		}
	});
};

const getBudgetSummary = async (req, res) => {
	await migrateLegacyBudgetOwnership(req.user._id);

	const budgets = await Budget.find(buildOwnershipFilter(req.user._id)).lean();
	const expenses = await Transaction.aggregate([
		{
			$match: {
				user: req.user._id,
				type: 'expense',
				budget: { $ne: null }
			}
		},
		{
			$group: {
				_id: '$budget',
				spent: { $sum: '$amount' }
			}
		}
	]);

	const spentByBudget = new Map(expenses.map((item) => [String(item._id), item.spent]));

	const summary = budgets.map((budget) => {
		const spent = spentByBudget.get(String(budget._id)) || 0;

		return {
			...budget,
			spent,
			remaining: Math.max(budget.amount - spent, 0)
		};
	});

	return res.json(summary);
};

const getBudgetById = async (req, res) => {
	const { id } = req.params;

	if (!isValidId(id)) {
		return res.status(400).json({ message: 'Invalid budget id' });
	}

	await migrateLegacyBudgetOwnership(req.user._id);

	const budget = await Budget.findOne({ _id: id, user: req.user._id });
	
	const ownedBudget = budget || (await Budget.findOne({ _id: id, userId: req.user._id }));

	if (!ownedBudget) {
		return res.status(404).json({ message: 'Budget not found' });
	}

	return res.json(ownedBudget);
};

const createBudget = async (req, res) => {
	await migrateLegacyBudgetOwnership(req.user._id);

	const { name, category, amount, period, startDate, endDate, notes } = req.body;

	if (!name || amount === undefined) {
		return res.status(400).json({ message: 'Name and amount are required' });
	}

	const numericAmount = Number(amount);

	if (Number.isNaN(numericAmount) || numericAmount < 0) {
		return res.status(400).json({ message: 'Amount must be a non-negative number' });
	}

	const budget = await Budget.create({
		user: req.user._id,
		userId: req.user._id,
		name,
		category,
		amount: numericAmount,
		period,
		startDate,
		endDate,
		notes
	});

	return res.status(201).json(budget);
};

const updateBudget = async (req, res) => {
	const { id } = req.params;

	if (!isValidId(id)) {
		return res.status(400).json({ message: 'Invalid budget id' });
	}

	await migrateLegacyBudgetOwnership(req.user._id);

	const budget = await Budget.findOne({ _id: id, ...buildOwnershipFilter(req.user._id) });

	if (!budget) {
		return res.status(404).json({ message: 'Budget not found' });
	}

	const updatableFields = ['name', 'category', 'period', 'startDate', 'endDate', 'notes'];
	for (const field of updatableFields) {
		if (req.body[field] !== undefined) {
			budget[field] = req.body[field];
		}
	}

	if (req.body.amount !== undefined) {
		const numericAmount = Number(req.body.amount);

		if (Number.isNaN(numericAmount) || numericAmount < 0) {
			return res.status(400).json({ message: 'Amount must be a non-negative number' });
		}

		budget.amount = numericAmount;
	}

	await budget.save();

	return res.json(budget);
};

const deleteBudget = async (req, res) => {
	const { id } = req.params;

	if (!isValidId(id)) {
		return res.status(400).json({ message: 'Invalid budget id' });
	}

	await migrateLegacyBudgetOwnership(req.user._id);

	const budget = await Budget.findOne({ _id: id, ...buildOwnershipFilter(req.user._id) });

	if (!budget) {
		return res.status(404).json({ message: 'Budget not found' });
	}

	await Transaction.updateMany(
		{ budget: budget._id, user: req.user._id },
		{ $unset: { budget: 1 } }
	);
	await budget.deleteOne();

	return res.json({ message: 'Budget deleted successfully' });
};

export {
	listBudgets,
	getBudgetSummary,
	getBudgetById,
	createBudget,
	updateBudget,
	deleteBudget
};
