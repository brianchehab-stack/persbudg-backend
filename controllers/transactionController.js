import mongoose from 'mongoose';

import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const buildPagination = (query) => {
	const page = Math.max(parseInt(query.page || '1', 10), 1);
	const limit = Math.min(Math.max(parseInt(query.limit || '10', 10), 1), 100);
	const skip = (page - 1) * limit;

	return { page, limit, skip };
};

const buildTransactionFilters = (userId, query) => {
	const filters = { user: userId };

	if (query.type) {
		filters.type = query.type;
	}

	if (query.category) {
		filters.category = query.category;
	}

	if (query.budget && isValidId(query.budget)) {
		filters.budget = query.budget;
	}

	if (query.startDate || query.endDate) {
		filters.date = {};

		if (query.startDate) {
			filters.date.$gte = new Date(query.startDate);
		}

		if (query.endDate) {
			filters.date.$lte = new Date(query.endDate);
		}
	}

	return filters;
};

const listTransactions = async (req, res) => {
	const { page, limit, skip } = buildPagination(req.query);
	const filters = buildTransactionFilters(req.user._id, req.query);
	const [transactions, total] = await Promise.all([
		Transaction.find(filters)
			.populate('budget', 'name category amount')
			.sort({ date: -1, createdAt: -1 })
			.skip(skip)
			.limit(limit),
		Transaction.countDocuments(filters)
	]);

	return res.json({
		items: transactions,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.max(Math.ceil(total / limit), 1)
		}
	});
};

const getTransactionSummary = async (req, res) => {
	const summary = await Transaction.aggregate([
		{
			$match: {
				user: req.user._id
			}
		},
		{
			$group: {
				_id: '$type',
				total: { $sum: '$amount' }
			}
		}
	]);

	const totals = {
		income: 0,
		expense: 0
	};

	for (const item of summary) {
		totals[item._id] = item.total;
	}

	return res.json({
		...totals,
		balance: totals.income - totals.expense
	});
};

const getTransactionById = async (req, res) => {
	const { id } = req.params;

	if (!isValidId(id)) {
		return res.status(400).json({ message: 'Invalid transaction id' });
	}

	const transaction = await Transaction.findOne({ _id: id, user: req.user._id }).populate(
		'budget',
		'name category amount'
	);

	if (!transaction) {
		return res.status(404).json({ message: 'Transaction not found' });
	}

	return res.json(transaction);
};

const createTransaction = async (req, res) => {
	const { budget, type, category, amount, description, date } = req.body;

	if (!type || !category || amount === undefined) {
		return res.status(400).json({ message: 'Type, category, and amount are required' });
	}

	const numericAmount = Number(amount);

	if (Number.isNaN(numericAmount) || numericAmount < 0) {
		return res.status(400).json({ message: 'Amount must be a non-negative number' });
	}

	let budgetId;
	if (budget !== undefined && budget !== null && budget !== '') {
		if (!isValidId(budget)) {
			return res.status(400).json({ message: 'Invalid budget id' });
		}

		const existingBudget = await Budget.findOne({ _id: budget, user: req.user._id });

		if (!existingBudget) {
			return res.status(404).json({ message: 'Budget not found' });
		}

		budgetId = existingBudget._id;
	}

	const transaction = await Transaction.create({
		user: req.user._id,
		budget: budgetId,
		type,
		category,
		amount: numericAmount,
		description,
		date
	});

	const populatedTransaction = await transaction.populate('budget', 'name category amount');
	return res.status(201).json(populatedTransaction);
};

const updateTransaction = async (req, res) => {
	const { id } = req.params;

	if (!isValidId(id)) {
		return res.status(400).json({ message: 'Invalid transaction id' });
	}

	const transaction = await Transaction.findOne({ _id: id, user: req.user._id });

	if (!transaction) {
		return res.status(404).json({ message: 'Transaction not found' });
	}

	if (req.body.budget !== undefined) {
		if (req.body.budget === null || req.body.budget === '') {
			transaction.budget = undefined;
		} else {
			if (!isValidId(req.body.budget)) {
				return res.status(400).json({ message: 'Invalid budget id' });
			}

			const existingBudget = await Budget.findOne({ _id: req.body.budget, user: req.user._id });

			if (!existingBudget) {
				return res.status(404).json({ message: 'Budget not found' });
			}

			transaction.budget = existingBudget._id;
		}
	}

	const updatableFields = ['type', 'category', 'description', 'date'];
	for (const field of updatableFields) {
		if (req.body[field] !== undefined) {
			transaction[field] = req.body[field];
		}
	}

	if (req.body.amount !== undefined) {
		const numericAmount = Number(req.body.amount);

		if (Number.isNaN(numericAmount) || numericAmount < 0) {
			return res.status(400).json({ message: 'Amount must be a non-negative number' });
		}

		transaction.amount = numericAmount;
	}

	await transaction.save();
	const populatedTransaction = await transaction.populate('budget', 'name category amount');

	return res.json(populatedTransaction);
};

const deleteTransaction = async (req, res) => {
	const { id } = req.params;

	if (!isValidId(id)) {
		return res.status(400).json({ message: 'Invalid transaction id' });
	}

	const transaction = await Transaction.findOne({ _id: id, user: req.user._id });

	if (!transaction) {
		return res.status(404).json({ message: 'Transaction not found' });
	}

	await transaction.deleteOne();
	return res.json({ message: 'Transaction deleted successfully' });
};

export {
	listTransactions,
	getTransactionSummary,
	getTransactionById,
	createTransaction,
	updateTransaction,
	deleteTransaction
};
