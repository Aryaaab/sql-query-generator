const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const historyJsonPath = path.join(__dirname, '../data/history.json');

// 1. Mongoose Schema Definition
const HistorySchema = new mongoose.Schema({
  prompt: { type: String, required: false, default: '' },
  sqlQuery: { type: String, required: true },
  schemaName: { type: String, required: true },
  status: { type: String, required: true }, // 'SUCCESS' or 'ERROR'
  rowsAffected: { type: Number, default: 0 },
  executionTimeMs: { type: Number, default: 0.0 },
  errorMessage: { type: String, required: false },
  timestamp: { type: Date, default: Date.now }
});

const MongoHistory = mongoose.model('History', HistorySchema);

// 2. JSON Fallback Helper Functions
const getLogsFromJson = () => {
  try {
    if (!fs.existsSync(historyJsonPath)) {
      return [];
    }
    const data = fs.readFileSync(historyJsonPath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error('Failed to read history JSON:', error);
    return [];
  }
};

const saveLogToJson = (logData) => {
  try {
    const logs = getLogsFromJson();
    const newLog = {
      _id: new Date().getTime().toString(),
      ...logData,
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog); // Add to beginning (most recent first)
    fs.writeFileSync(historyJsonPath, JSON.stringify(logs, null, 2), 'utf8');
    return newLog;
  } catch (error) {
    console.error('Failed to write history JSON:', error);
    return logData;
  }
};

const clearLogsInJson = () => {
  try {
    fs.writeFileSync(historyJsonPath, '[]', 'utf8');
    return true;
  } catch (error) {
    console.error('Failed to clear history JSON:', error);
    return false;
  }
};

// 3. Unified Interface API Exports
const HistoryModel = {
  saveLog: async (logData) => {
    if (global.isMongoConnected) {
      try {
        const doc = new MongoHistory(logData);
        return await doc.save();
      } catch (err) {
        console.error('MongoDB write failed, writing to JSON fallback:', err.message);
        return saveLogToJson(logData);
      }
    } else {
      return saveLogToJson(logData);
    }
  },

  getLogs: async (limit = 50) => {
    if (global.isMongoConnected) {
      try {
        return await MongoHistory.find()
          .sort({ timestamp: -1 })
          .limit(limit);
      } catch (err) {
        console.error('MongoDB query failed, reading from JSON fallback:', err.message);
        return getLogsFromJson().slice(0, limit);
      }
    } else {
      return getLogsFromJson().slice(0, limit);
    }
  },

  clearLogs: async () => {
    if (global.isMongoConnected) {
      try {
        await MongoHistory.deleteMany({});
        return true;
      } catch (err) {
        console.error('MongoDB delete failed, clearing JSON fallback:', err.message);
        return clearLogsInJson();
      }
    } else {
      return clearLogsInJson();
    }
  }
};

module.exports = HistoryModel;
