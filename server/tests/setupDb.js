import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';

// Each integration test file calls this in its own beforeAll/afterAll — globalSetup only
// starts the in-memory Mongo server and exposes its URI via MONGODB_URI, it doesn't
// connect Mongoose itself (that has to happen inside the worker that actually runs the
// tests and requires the models/app).
export async function connectTestDb() {
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }
}

export async function disconnectTestDb() {
  await mongoose.connection.close();
}
