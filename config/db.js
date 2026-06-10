import mongoose from 'mongoose';

const isLocalMongoUri = (uri) =>
  typeof uri === 'string' &&
  (uri.includes('127.0.0.1') || uri.includes('localhost'));

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  const hasValidScheme =
    typeof mongoUri === 'string' &&
    (mongoUri.startsWith('mongodb://') || mongoUri.startsWith('mongodb+srv://'));

  if (!hasValidScheme) {
    console.warn(
      'Skipping MongoDB connection: set MONGO_URI to a valid mongodb:// or mongodb+srv:// URI.'
    );
    return false;
  }

  if (process.env.NODE_ENV === 'production' && isLocalMongoUri(mongoUri)) {
    console.warn(
      'MONGO_URI points to localhost in production. For Render, set MONGO_URI to MongoDB Atlas or another external MongoDB host.'
    );
  }

  try {
    mongoose.set('bufferCommands', false);

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 300000,
      socketTimeoutMS: 450000,
    });

    console.log('MongoDB Connected');
    return true;
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);

    if (isLocalMongoUri(mongoUri)) {
      console.error(
        'Detected local MongoDB URI. In Render, 127.0.0.1/localhost is not your local machine. Set MONGO_URI to your Atlas connection string.'
      );
    }

    return false;
  }
};

export default connectDB;