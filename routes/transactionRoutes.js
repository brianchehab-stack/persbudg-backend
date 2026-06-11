import express from 'express';

import {
	createTransaction,
	deleteTransaction,
	getTransactionCategoryOptions,
	getTransactionById,
	getTransactionSummary,
	listTransactions,
	updateTransaction
} from '../controllers/transactionController.js';
import protect from '../middleware/authMiddleware.js';
import {
	validatePaginationQuery,
	validateTransactionListQuery,
	validateTransactionPayload
} from '../middleware/validateRequest.js';

const router = express.Router();

router.use(protect);

router.get('/', validatePaginationQuery, validateTransactionListQuery, listTransactions);
router.get('/category-options', getTransactionCategoryOptions);
router.get('/summary', getTransactionSummary);
router.get('/:id', getTransactionById);
router.post('/', validateTransactionPayload, createTransaction);
router.put('/:id', validateTransactionPayload, updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
