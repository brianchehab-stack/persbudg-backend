const sendValidationError = (res, message) =>
  res.status(400).json({ message });

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const isValidEmail = (value) =>
  typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const isValidDateValue = (value) => value === undefined || !Number.isNaN(Date.parse(value));

const isPositiveIntegerValue = (value) => {
  if (value === undefined) {
    return true;
  }

  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue > 0;
};

const validatePaginationQuery = (req, res, next) => {
  const { page, limit } = req.query;

  if (!isPositiveIntegerValue(page)) {
    return sendValidationError(res, 'Page must be a positive integer');
  }

  if (!isPositiveIntegerValue(limit)) {
    return sendValidationError(res, 'Limit must be a positive integer');
  }

  return next();
};

const validateTransactionListQuery = (req, res, next) => {
  const { type, category, budget, startDate, endDate } = req.query;

  if (type !== undefined && !['income', 'expense'].includes(type)) {
    return sendValidationError(res, 'Type filter must be income or expense');
  }

  if (category !== undefined && !isNonEmptyString(category)) {
    return sendValidationError(res, 'Category filter must be a non-empty string');
  }

  if (budget !== undefined && typeof budget === 'string' && budget.trim().length === 0) {
    return sendValidationError(res, 'Budget filter must be a valid id');
  }

  if (!isValidDateValue(startDate) || !isValidDateValue(endDate)) {
    return sendValidationError(res, 'Date filters must be valid ISO date values');
  }

  return next();
};

const validateRegistration = (req, res, next) => {
  const { name, email, password } = req.body;

  if (!isNonEmptyString(name)) {
    return sendValidationError(res, 'Name is required');
  }

  if (!isValidEmail(email)) {
    return sendValidationError(res, 'A valid email is required');
  }

  if (typeof password !== 'string' || password.length < 8) {
    return sendValidationError(res, 'Password must be at least 8 characters long');
  }

  return next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!isValidEmail(email)) {
    return sendValidationError(res, 'A valid email is required');
  }

  if (typeof password !== 'string' || password.length === 0) {
    return sendValidationError(res, 'Password is required');
  }

  return next();
};

const validateBudgetPayload = (req, res, next) => {
  const { name, amount, period, startDate, endDate } = req.body;
  const isCreate = req.method === 'POST';

  if (isCreate && !isNonEmptyString(name)) {
    return sendValidationError(res, 'Name is required');
  }

  if (name !== undefined && !isNonEmptyString(name)) {
    return sendValidationError(res, 'Name must be a non-empty string');
  }

  if (isCreate && amount === undefined) {
    return sendValidationError(res, 'Amount is required');
  }

  if (amount !== undefined) {
    const numericAmount = Number(amount);

    if (Number.isNaN(numericAmount) || numericAmount < 0) {
      return sendValidationError(res, 'Amount must be a non-negative number');
    }
  }

  if (period !== undefined && !['weekly', 'monthly', 'yearly', 'custom'].includes(period)) {
    return sendValidationError(res, 'Period must be weekly, monthly, yearly, or custom');
  }

  if (!isValidDateValue(startDate) || !isValidDateValue(endDate)) {
    return sendValidationError(res, 'Dates must be valid ISO date values');
  }

  return next();
};

const validateTransactionPayload = (req, res, next) => {
  const { type, category, amount, date } = req.body;
  const isCreate = req.method === 'POST';

  if (isCreate && !['income', 'expense'].includes(type)) {
    return sendValidationError(res, 'Type must be income or expense');
  }

  if (type !== undefined && !['income', 'expense'].includes(type)) {
    return sendValidationError(res, 'Type must be income or expense');
  }

  if (isCreate && !isNonEmptyString(category)) {
    return sendValidationError(res, 'Category is required');
  }

  if (category !== undefined && !isNonEmptyString(category)) {
    return sendValidationError(res, 'Category must be a non-empty string');
  }

  if (isCreate && amount === undefined) {
    return sendValidationError(res, 'Amount is required');
  }

  if (amount !== undefined) {
    const numericAmount = Number(amount);

    if (Number.isNaN(numericAmount) || numericAmount < 0) {
      return sendValidationError(res, 'Amount must be a non-negative number');
    }
  }

  if (!isValidDateValue(date)) {
    return sendValidationError(res, 'Date must be a valid ISO date value');
  }

  return next();
};

const validateRefreshTokenPayload = (req, res, next) => {
  if (!isNonEmptyString(req.body.refreshToken)) {
    return sendValidationError(res, 'Refresh token is required');
  }

  return next();
};

const validateForgotPasswordPayload = (req, res, next) => {
  if (!isValidEmail(req.body.email)) {
    return sendValidationError(res, 'A valid email is required');
  }

  return next();
};

const validateResetPasswordPayload = (req, res, next) => {
  if (!isNonEmptyString(req.body.token)) {
    return sendValidationError(res, 'Reset token is required');
  }

  if (typeof req.body.password !== 'string' || req.body.password.length < 8) {
    return sendValidationError(res, 'Password must be at least 8 characters long');
  }

  return next();
};

export {
  validateBudgetPayload,
  validateForgotPasswordPayload,
  validatePaginationQuery,
  validateLogin,
  validateRegistration,
  validateRefreshTokenPayload,
  validateResetPasswordPayload,
  validateTransactionListQuery,
  validateTransactionPayload
};
