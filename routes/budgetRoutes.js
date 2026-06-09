import express from 'express';

import {
	createBudget,
	deleteBudget,
	getBudgetById,
	getBudgetSummary,
	listBudgets,
	updateBudget
} from '../controllers/budgetController.js';
import protect from '../middleware/authMiddleware.js';
import { validateBudgetPayload, validatePaginationQuery } from '../middleware/validateRequest.js';

const router = express.Router();

router.use(protect);

router.get('/', validatePaginationQuery, listBudgets);
router.get('/summary', getBudgetSummary);
router.get('/:id', getBudgetById);
router.post('/', validateBudgetPayload, createBudget);
router.put('/:id', validateBudgetPayload, updateBudget);
router.delete('/:id', deleteBudget);

export default router;
