import express from 'express';

import {
	getCurrentUser,
	loginUser,
	logoutUser,
	refreshAuth,
	registerUser
} from '../controllers/authController.js';
import protect from '../middleware/authMiddleware.js';
import {
	validateLogin,
	validateRefreshTokenPayload,
	validateRegistration
} from '../middleware/validateRequest.js';

const router = express.Router();

router.post('/register', validateRegistration, registerUser);
router.post('/login', validateLogin, loginUser);
router.post('/refresh', validateRefreshTokenPayload, refreshAuth);
router.post('/logout', protect, logoutUser);
router.get('/me', protect, getCurrentUser);

export default router;

