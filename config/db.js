import mongoose from 'mongoose';

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  const hasValidScheme =
    typeof mongoUri === 'string' &&
    (mongoUri.startsWith('mongodb://') || mongoUri.startsWith('mongodb+srv://'));

  if (!hasValidScheme) {
    console.warn(
      'Skipping MongoDB connection: set MONGO_URI to a valid mongodb:// or mongodb+srv:// URI.'
    );
    return false;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected');
    return true;
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    return false;
  }
};

export default connectDB;