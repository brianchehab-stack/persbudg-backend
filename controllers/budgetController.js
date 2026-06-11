import mongoose from 'mongoose';

import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';

const isValidId = (id) => /^[0-9a-fA-F]{24}$/.test(String(id ?? ''));

const buildOwnershipFilter = (userId) => ({
	ownerId: userId
});

const migrateLegacyBudgetOwnership = async (userId) => {
	await Budget.collection.updateMany(
		{ ownerId: { $exists: false }, $or: [{ user: userId }, { userId }] },
		{ $set: { ownerId: userId } }
	);

	// Docs with userId only — backfill user
	await Budget.collection.updateMany(
		{ user: { $exists: false }, userId },
		{ $set: { user: userId } }
	);

	// Docs with user only — backfill userId
	await Budget.collection.updateMany(
		{ user: userId, userId: { $exists: false } },
		{ $set: { userId } }
	);
};

const buildPagination = (query) => {
	const page = Math.max(parseInt(query.page || '1', 10), 1);
	const limit = Math.min(Math.max(parseInt(query.limit || '10', 10), 1), 100);
	const skip = (page - 1) * limit;

	return { page, limit, skip };
};

const normalizeBudgetPeriod = (period) => {
	if (typeof period !== 'string') {
		return period;
	}

	return period.trim().toLowerCase();
};

const logBudgetWrite = (action, userId, budgetId) => {
	if (process.env.NODE_ENV === 'test') {
		return;
	}

	console.info(`[budget:${action}] ownerId=${String(userId)} budgetId=${String(budgetId)}`);
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
				ownerId: req.user._id,
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

	const ownedBudget = await Budget.findOne({ _id: id, ...buildOwnershipFilter(req.user._id) });

	if (!ownedBudget) {
		return res.status(404).json({ message: 'Budget not found' });
	}

	return res.json(ownedBudget);
};

const createBudget = async (req, res) => {
	await migrateLegacyBudgetOwnership(req.user._id);

	const { name, category, amount, period, startDate, endDate, notes } = req.body;
	const normalizedPeriod = normalizeBudgetPeriod(period);

	if (!name || amount === undefined) {
		return res.status(400).json({ message: 'Name and amount are required' });
	}

	const numericAmount = Number(amount);

	if (Number.isNaN(numericAmount) || numericAmount < 0) {
		return res.status(400).json({ message: 'Amount must be a non-negative number' });
	}

	const budget = await Budget.create({
		ownerId: req.user._id,
		user: req.user._id,
		userId: req.user._id,
		ownerUsername: req.user.email,
		name,
		category,
		amount: numericAmount,
		period: normalizedPeriod,
		startDate,
		endDate,
		notes
	});

	logBudgetWrite('create', req.user._id, budget._id);

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
			budget[field] = field === 'period' ? normalizeBudgetPeriod(req.body[field]) : req.body[field];
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
	logBudgetWrite('update', req.user._id, budget._id);

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
		{ budget: budget._id, ownerId: req.user._id },
		{ $unset: { budget: 1 } }
	);
	await budget.deleteOne();
	logBudgetWrite('delete', req.user._id, budget._id);

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


