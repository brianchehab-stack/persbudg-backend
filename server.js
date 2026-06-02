import authRoutes      from './routes/authRoutes.js';
import budgetRoutes from './routes/budgetRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import connectDB from './config/db.js';


const express = require('express');
const cors = require('cors');
require('dotenv').config();


connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Personal Budget is running' });
});
const authRoutes = require("./routes/authRoutes");

app.use("/api/auth", authRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));