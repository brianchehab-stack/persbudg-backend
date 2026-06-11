import dotenv from 'dotenv';
import mongoose from 'mongoose';

import connectDB from '../config/db.js';
import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';

dotenv.config();

const runMigration = async () => {
  const connected = await connectDB();

  if (!connected || mongoose.connection.readyState !== 1) {
    console.error('Database connection is required. Check MONGO_URI and try again.');
    process.exit(1);
  }

  try {
    // Backfill ownerId from legacy userId field.
    const budgetsFromUserId = await Budget.updateMany(
      { ownerId: { $exists: false }, userId: { $exists: true } },
      [{ $set: { ownerId: '$userId' } }],
      { updatePipeline: true }
    );

    // Backfill ownerId from legacy user field.
    const budgetsFromUser = await Budget.updateMany(
      { ownerId: { $exists: false }, user: { $exists: true } },
      [{ $set: { ownerId: '$user' } }],
      { updatePipeline: true }
    );

    // Normalize legacy ownership aliases from ownerId.
    const budgetsUserFromOwner = await Budget.updateMany(
      { user: { $exists: false }, ownerId: { $exists: true } },
      [{ $set: { user: '$ownerId' } }],
      { updatePipeline: true }
    );

    const budgetsUserIdFromOwner = await Budget.updateMany(
      { userId: { $exists: false }, ownerId: { $exists: true } },
      [{ $set: { userId: '$ownerId' } }],
      { updatePipeline: true }
    );

    const transactionsFromUserId = await Transaction.updateMany(
      { ownerId: { $exists: false }, userId: { $exists: true } },
      [{ $set: { ownerId: '$userId' } }],
      { updatePipeline: true }
    );

    const transactionsFromUser = await Transaction.updateMany(
      { ownerId: { $exists: false }, user: { $exists: true } },
      [{ $set: { ownerId: '$user' } }],
      { updatePipeline: true }
    );

    const transactionsUserFromOwner = await Transaction.updateMany(
      { user: { $exists: false }, ownerId: { $exists: true } },
      [{ $set: { user: '$ownerId' } }],
      { updatePipeline: true }
    );

    const transactionsUserIdFromOwner = await Transaction.updateMany(
      { userId: { $exists: false }, ownerId: { $exists: true } },
      [{ $set: { userId: '$ownerId' } }],
      { updatePipeline: true }
    );

    console.log('Backfill complete.');
    console.log(
      JSON.stringify(
        {
          budgets: {
            ownerIdFromUserId: budgetsFromUserId.modifiedCount,
            ownerIdFromUser: budgetsFromUser.modifiedCount,
            userFromOwnerId: budgetsUserFromOwner.modifiedCount,
            userIdFromOwnerId: budgetsUserIdFromOwner.modifiedCount
          },
          transactions: {
            ownerIdFromUserId: transactionsFromUserId.modifiedCount,
            ownerIdFromUser: transactionsFromUser.modifiedCount,
            userFromOwnerId: transactionsUserFromOwner.modifiedCount,
            userIdFromOwnerId: transactionsUserIdFromOwner.modifiedCount
          }
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error(`OwnerId backfill failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

runMigration();
