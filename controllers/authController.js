import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

const accessTokenExpiresIn = '15m';
const refreshTokenExpiresIn = '7d';

const generateAccessToken = (userId) =>
	jwt.sign({ id: userId, tokenType: 'access' }, process.env.JWT_SECRET, {
		expiresIn: accessTokenExpiresIn
	});

const generateRefreshToken = (userId) =>
	jwt.sign({ id: userId, tokenType: 'refresh' }, process.env.JWT_SECRET, {
		expiresIn: refreshTokenExpiresIn
	});

const buildOwnershipFilter = (userId) => ({
	ownerId: userId
});

const buildEntriesPayload = async (userId) => {
	const filter = buildOwnershipFilter(userId);
	const [budgets, transactions] = await Promise.all([
		Budget.find(filter).sort({ createdAt: -1 }).lean(),
		Transaction.find(filter)
			.populate('budget', 'name category amount')
			.sort({ date: -1, createdAt: -1 })
			.lean()
	]);

	return {
		budgets,
		transactions: transactions.map((transaction) => ({
			...transaction,
			note: transaction.description ?? ''
		}))
	};
};

const buildAuthResponse = async (user, message) => {
	const accessToken = generateAccessToken(user._id);
	const refreshToken = generateRefreshToken(user._id);
	const entries = await buildEntriesPayload(user._id);

	user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
	await user.save();

	return {
		message,
		accessToken,
		refreshToken,
		token: accessToken,
		entries,
		user: {
			id: user._id,
			name: user.name,
			email: user.email
		}
	};
};

const registerUser = async (req, res) => {
	const { name, email, password } = req.body;

	if (!name || !email || !password) {
		return res.status(400).json({ message: 'Name, email, and password are required' });
	}

	const existingUser = await User.findOne({ email: email.toLowerCase() });

	if (existingUser) {
		return res.status(409).json({ message: 'User already exists' });
	}

	const hashedPassword = await bcrypt.hash(password, 10);

	const user = await User.create({
		name,
		email,
		password: hashedPassword
	});

	const authPayload = await buildAuthResponse(user, 'User registered successfully');

	return res.status(201).json({
		...authPayload
	});
};

const loginUser = async (req, res) => {
	const { email, password } = req.body;

	if (!email || !password) {
		return res.status(400).json({ message: 'Email and password are required' });
	}

	const user = await User.findOne({ email: email.toLowerCase() });

	if (!user) {
		return res.status(401).json({ message: 'Invalid credentials' });
	}

	const passwordMatches = await bcrypt.compare(password, user.password);

	if (!passwordMatches) {
		return res.status(401).json({ message: 'Invalid credentials' });
	}

	const authPayload = await buildAuthResponse(user, `Welcome ${user.name}`);

	return res.json(authPayload);
};

const getCurrentUser = async (req, res) => {
	const entries = await buildEntriesPayload(req.user._id);

	return res.json({
		user: req.user,
		entries
	});
};

const refreshAuth = async (req, res) => {
	const { refreshToken } = req.body;

	if (!refreshToken) {
		return res.status(400).json({ message: 'Refresh token is required' });
	}

	let decoded;

	try {
		decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
	} catch (error) {
		return res.status(401).json({ message: 'Invalid refresh token' });
	}

	if (decoded.tokenType !== 'refresh') {
		return res.status(401).json({ message: 'Invalid refresh token' });
	}

	const user = await User.findById(decoded.id);

	if (!user || !user.refreshTokenHash) {
		return res.status(401).json({ message: 'Invalid refresh token' });
	}

	const tokenMatches = await bcrypt.compare(refreshToken, user.refreshTokenHash);

	if (!tokenMatches) {
		return res.status(401).json({ message: 'Invalid refresh token' });
	}

	const authPayload = await buildAuthResponse(user, 'Token refreshed successfully');

	return res.json(authPayload);
};

const logoutUser = async (req, res) => {
	if (req.userDoc) {
		req.userDoc.refreshTokenHash = null;
		await req.userDoc.save();
	}

	return res.json({ message: 'Logged out successfully' });
};

const forgotPassword = async (req, res) => {
	const { email } = req.body;
	const user = await User.findOne({ email: email.toLowerCase() });

	if (!user) {
		return res.json({
			message:
				'If an account with that email exists, a password reset link has been generated.'
		});
	}

	const resetToken = crypto.randomBytes(32).toString('hex');
	const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
	const resetExpiry = new Date(Date.now() + 15 * 60 * 1000);

	user.passwordResetTokenHash = resetTokenHash;
	user.passwordResetExpiresAt = resetExpiry;
	await user.save();

	const responsePayload = {
		message: 'If an account with that email exists, a password reset link has been generated.'
	};

	if (process.env.NODE_ENV !== 'production') {
		responsePayload.resetToken = resetToken;
		responsePayload.expiresAt = resetExpiry.toISOString();
	}

	return res.json(responsePayload);
};

const resetPassword = async (req, res) => {
	const { token, password } = req.body;
	const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

	const user = await User.findOne({
		passwordResetTokenHash: resetTokenHash,
		passwordResetExpiresAt: { $gt: new Date() }
	});

	if (!user) {
		return res.status(400).json({ message: 'Invalid or expired password reset token' });
	}

	user.password = await bcrypt.hash(password, 10);
	user.passwordResetTokenHash = null;
	user.passwordResetExpiresAt = null;
	user.refreshTokenHash = null;
	await user.save();

	return res.json({ message: 'Password reset successful' });
};

export {
	registerUser,
	loginUser,
	getCurrentUser,
	refreshAuth,
	logoutUser,
	forgotPassword,
	resetPassword
};
