const transactionCategoryOptions = {
	income: [
		'Salary',
		'Freelance',
		'Business',
		'Investment',
		'Rental',
		'Bonus',
		'Gift',
		'Refund',
		'Other Income'
	],
	expense: [
		'Housing',
		'Utilities',
		'Food',
		'Groceries',
		'Transportation',
		'Fuel',
		'Rent',
		'Dining',
		'Healthcare',
		'Insurance',
		'Education',
		'Entertainment',
		'Lifestyle',
		'Debt',
		'Taxes',
		'Travel',
		'Childcare',
		'Savings',
		'Other Expense'
	]
};

const normalizeCategory = (value) => {
	if (typeof value !== 'string') {
		return '';
	}

	return value.trim();
};

const getAllTransactionCategories = () => [
	...transactionCategoryOptions.income,
	...transactionCategoryOptions.expense
];

const isValidTransactionType = (value) => ['income', 'expense'].includes(value);

const isValidCategoryForType = (type, category) => {
	if (!isValidTransactionType(type)) {
		return false;
	}

	const normalizedCategory = normalizeCategory(category);
	if (!normalizedCategory) {
		return false;
	}

	return transactionCategoryOptions[type].includes(normalizedCategory);
};

const isKnownTransactionCategory = (category) => {
	const normalizedCategory = normalizeCategory(category);
	if (!normalizedCategory) {
		return false;
	}

	return getAllTransactionCategories().includes(normalizedCategory);
};

export {
	transactionCategoryOptions,
	normalizeCategory,
	getAllTransactionCategories,
	isValidCategoryForType,
	isKnownTransactionCategory,
	isValidTransactionType
};
