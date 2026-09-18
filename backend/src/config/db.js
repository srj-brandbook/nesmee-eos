const mongoose = require("mongoose");
const logger = require("./logger");

async function connectDb(uri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  logger.info("Connected to MongoDB");
}

async function disconnectDb() {
  await mongoose.disconnect();
}

module.exports = { connectDb, disconnectDb };
