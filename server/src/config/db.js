const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in the environment');
  }
  await mongoose.connect(uri, { dbName: 'barbermax' });
  console.log('MongoDB connected');
}

module.exports = connectDB;
