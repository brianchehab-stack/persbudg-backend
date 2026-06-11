import mongoose from 'mongoose';

import {
	isValidCategoryForType,
	normalizeCategory,
	transactionCategoryOptions
} from '../config/transactionCategories.js';
import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';

const isValidId = (id) => /^[0-9a-fA-F]{24}$/.test(String(id ?? ''));

const buildTransactionOwnershipFilter = (userId) => ({
	$or: [{ user: userId }, { userId }]
});

const migrateLegacyTransactionFields = async (userId) => {
	// Docs saved with userId only — backfill user
	await Transaction.collection.updateMany(
		{ user: { $exists: false }, userId },
		{ $set: { user: userId } }
	);

	// Docs saved with user only — backfill userId
	await Transaction.collection.updateMany(
		{ user: userId, userId: { $exists: false } },
		{ $set: { userId } }
	);

	// Docs with budgetId but no budget
	await Transaction.collection.updateMany(
		{ user: userId, budget: { $exists: false }, budgetId: { $type: 'objectId' } },
		[{ $set: { budget: '$budgetId' } }]
	);
};

const buildPagination = (query) => {
	const page = Math.max(parseInt(query.page || '1', 10), 1);
	const limit = Math.min(Math.max(parseInt(query.limit || '10', 10), 1), 100);
	const skip = (page - 1) * limit;

	return { page, limit, skip };
};

const normalizeNote = (value) => {
	if (value === undefined || value === null) {
		return undefined;
	}

	return String(value);
};

const withNoteField = (transaction) => {
	const plainTransaction = transaction?.toObject ? transaction.toObject() : transaction;

	if (!plainTransaction) {
		return plainTransaction;
	}

	return {
		...plainTransaction,
		note: plainTransaction.description ?? ''
	};
};

const buildTransactionFilters = (userId, query) => {
	const filters = buildTransactionOwnershipFilter(userId);

	if (query.type) {
		filters.type = query.type;
	}

	if (query.category) {
		filters.category = normalizeCategory(query.category);
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

const getTransactionCategoryOptions = async (req, res) => {
	return res.json(transactionCategoryOptions);
};

const listTransactions = async (req, res) => {
	await migrateLegacyTransactionFields(req.user._id);

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
	const transactionItems = transactions.map((transaction) => withNoteField(transaction));

	return res.json({
		items: transactionItems,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.max(Math.ceil(total / limit), 1)
		}
	});
};

const getTransactionSummary = async (req, res) => {
	await migrateLegacyTransactionFields(req.user._id);

	const summary = await Transaction.aggregate([
		{
			$match: {
				$or: [{ user: req.user._id }, { userId: req.user._id }]
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

	await migrateLegacyTransactionFields(req.user._id);

	const transaction = await Transaction.findOne({
		_id: id,
		...buildTransactionOwnershipFilter(req.user._id)
	}).populate('budget', 'name category amount');

	if (!transaction) {
		return res.status(404).json({ message: 'Transaction not found' });
	}

	return res.json(withNoteField(transaction));
};

const createTransaction = async (req, res) => {
	await migrateLegacyTransactionFields(req.user._id);

	const { type, category, amount, date } = req.body;
	const budget = req.body.budget ?? req.body.budgetId;
	const note = normalizeNote(req.body.note ?? req.body.description);
	const normalizedCategory = normalizeCategory(category);

	if (!type || !normalizedCategory || amount === undefined) {
		return res.status(400).json({ message: 'Type, category, and amount are required' });
	}

	if (!isValidCategoryForType(type, normalizedCategory)) {
		return res.status(400).json({ message: 'Category must match the selected type' });
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
		userId: req.user._id,
		budget: budgetId,
		type,
		category: normalizedCategory,
		amount: numericAmount,
		description: note,
		date
	});

	const populatedTransaction = await transaction.populate('budget', 'name category amount');
	return res.status(201).json(withNoteField(populatedTransaction));
};

const updateTransaction = async (req, res) => {
	const { id } = req.params;

	if (!isValidId(id)) {
		return res.status(400).json({ message: 'Invalid transaction id' });
	}

	await migrateLegacyTransactionFields(req.user._id);

	const transaction = await Transaction.findOne({
		_id: id,
		...buildTransactionOwnershipFilter(req.user._id)
	});

	if (!transaction) {
		return res.status(404).json({ message: 'Transaction not found' });
	}

	const nextBudget = req.body.budget ?? req.body.budgetId;
	const nextType = req.body.type ?? transaction.type;
	const nextCategoryRaw = req.body.category ?? transaction.category;
	const nextCategory = normalizeCategory(nextCategoryRaw);
	const nextNote = normalizeNote(req.body.note ?? req.body.description);

	if (!isValidCategoryForType(nextType, nextCategory)) {
		return res.status(400).json({ message: 'Category must match the selected type' });
	}

	if (nextBudget !== undefined) {
		if (nextBudget === null || nextBudget === '') {
			transaction.budget = undefined;
		} else {
			if (!isValidId(nextBudget)) {
				return res.status(400).json({ message: 'Invalid budget id' });
			}

			const existingBudget = await Budget.findOne({
				_id: nextBudget,
				...buildTransactionOwnershipFilter(req.user._id)
			});

			if (!existingBudget) {
				return res.status(404).json({ message: 'Budget not found' });
			}

			transaction.budget = existingBudget._id;
		}
	}

	const updatableFields = ['type', 'category', 'date'];
	for (const field of updatableFields) {
		if (req.body[field] !== undefined) {
			transaction[field] = field === 'category' ? nextCategory : req.body[field];
		}
	}

	if (nextNote !== undefined) {
		transaction.description = nextNote;
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

	return res.json(withNoteField(populatedTransaction));
};

const deleteTransaction = async (req, res) => {
	const { id } = req.params;

	if (!isValidId(id)) {
		return res.status(400).json({ message: 'Invalid transaction id' });
	}

	await migrateLegacyTransactionFields(req.user._id);

	const transaction = await Transaction.findOne({
		_id: id,
		...buildTransactionOwnershipFilter(req.user._id)
	});

	if (!transaction) {
		return res.status(404).json({ message: 'Transaction not found' });
	}

	await transaction.deleteOne();
	return res.json({ message: 'Transaction deleted successfully' });
};

export {
	listTransactions,
	getTransactionCategoryOptions,
	getTransactionSummary,
	getTransactionById,
	createTransaction,
	updateTransaction,
	deleteTransaction
};
