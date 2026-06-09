import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import connectDB from '../config/db.js';
import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

dotenv.config();

const demoUser = {
  name: 'Demo User',
  email: 'demo@persbudg.local',
  password: 'Password123!'
};

const budgetSeed = [
  {
    name: 'Housing',
    category: 'Living',
    amount: 1500,
    period: 'monthly',
    notes: 'Rent and utilities'
  },
  {
    name: 'Groceries',
    category: 'Food',
    amount: 500,
    period: 'monthly',
    notes: 'Household groceries'
  },
  {
    name: 'Transportation',
    category: 'Travel',
    amount: 250,
    period: 'monthly',
    notes: 'Fuel and transit'
  }
];

const transactionSeed = (userId, budgetsByName) => [
  {
    user: userId,
    type: 'income',
    category: 'Salary',
    amount: 4200,
    description: 'Monthly paycheck',
    date: new Date()
  },
  {
    user: userId,
    budget: budgetsByName.Housing,
    type: 'expense',
    category: 'Rent',
    amount: 1200,
    description: 'Apartment rent',
    date: new Date()
  },
  {
    user: userId,
    budget: budgetsByName.Groceries,
    type: 'expense',
    category: 'Groceries',
    amount: 145.32,
    description: 'Weekly grocery trip',
    date: new Date()
  },
  {
    user: userId,
    budget: budgetsByName.Transportation,
    type: 'expense',
    category: 'Fuel',
    amount: 52.4,
    description: 'Gas refill',
    date: new Date()
  }
];

const clearDatabase = async () => {
  await Transaction.deleteMany();
  await Budget.deleteMany();
  await User.deleteMany();
  console.log('Seed data cleared');
};

const seedDatabase = async () => {
  const hashedPassword = await bcrypt.hash(demoUser.password, 10);
  const user = await User.create({
    ...demoUser,
    password: hashedPassword
  });

  const budgets = await Budget.insertMany(
    budgetSeed.map((budget) => ({
      ...budget,
      user: user._id
    }))
  );

  const budgetsByName = budgets.reduce((accumulator, budget) => {
    accumulator[budget.name] = budget._id;
    return accumulator;
  }, {});

  await Transaction.insertMany(transactionSeed(user._id, budgetsByName));

  console.log('Seed data created');
  console.log(`Demo login email: ${demoUser.email}`);
  console.log(`Demo login password: ${demoUser.password}`);
};

const run = async () => {
  const connected = await connectDB();

  if (!connected || mongoose.connection.readyState !== 1) {
    console.error('Database connection required for seeding. Check MONGO_URI and MongoDB availability.');
    process.exit(1);
  }

  try {
    if (process.argv.includes('--clear')) {
      await clearDatabase();
    } else {
      await clearDatabase();
      await seedDatabase();
    }
  } catch (error) {
    console.error(`Seed failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

run();
