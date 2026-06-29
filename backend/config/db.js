const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

global.isMongoConnected = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sql_query_generator';
  try {
    console.log('Attempting to connect to MongoDB...');
    // Limit server selection timeout to 3 seconds for fast JSON fallback
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000
    });
    console.log('MongoDB connected successfully.');
    global.isMongoConnected = true;
  } catch (err) {
    console.warn('MongoDB connection failed:', err.message);
    console.warn('Falling back to local JSON file storage.');
    global.isMongoConnected = false;
    
    // Ensure data directory exists for JSON storage files
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }
};

module.exports = connectDB;
