import express from 'express';

import {
	forgotPassword,
	getCurrentUser,
	loginUser,
	logoutUser,
	resetPassword,
	refreshAuth,
	registerUser
} from '../controllers/authController.js';
import protect from '../middleware/authMiddleware.js';
import {
	validateForgotPasswordPayload,
	validateLogin,
	validateRefreshTokenPayload,
	validateResetPasswordPayload,
	validateRegistration
} from '../middleware/validateRequest.js';

const router = express.Router();

router.post('/register', validateRegistration, registerUser);
router.post('/login', validateLogin, loginUser);
router.post('/forgot-password', validateForgotPasswordPayload, forgotPassword);
router.post('/reset-password', validateResetPasswordPayload, resetPassword);
router.post('/refresh', validateRefreshTokenPayload, refreshAuth);
router.post('/logout', protect, logoutUser);
router.get('/me', protect, getCurrentUser);

export default router;

