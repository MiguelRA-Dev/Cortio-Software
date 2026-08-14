import { MongoMemoryServer } from 'mongodb-memory-server';

// Runs once in the main Vitest process, before any test file. Setting MONGODB_URI here
// (rather than inside a test file) means it's already in process.env by the time worker
// processes spawn and require src/config/db.js — no test ever touches the real Atlas or
// Cosmos DB clusters.
export default async function setup() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

  return async function teardown() {
    await mongod.stop();
  };
}
