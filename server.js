import dotenv from 'dotenv';


import app from './app.js';
import connectDB from './config/db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
	const connected = await connectDB();

	if (!connected) {
		console.error('Server startup aborted: MongoDB connection is required.');
		process.exit(1);
	}

	app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

startServer();