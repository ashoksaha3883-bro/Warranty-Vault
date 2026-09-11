const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI,
      {
        maxPoolSize: 20,
        minPoolSize: 2,

        // Do not wait too long when MongoDB
        // cannot provide a connection.
        waitQueueTimeoutMS: 5000,

        serverSelectionTimeoutMS: 5000,

        maxIdleTimeMS: 30000,
      }
    );

    console.log(
      "MongoDB connected successfully"
    );
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error.message
    );

    process.exit(1);
  }
};

module.exports = connectDB;