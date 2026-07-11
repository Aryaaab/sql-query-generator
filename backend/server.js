const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');

// Load env variables
const envPath = path.resolve(__dirname, './.env');
dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 8000;

// Connect to MongoDB (will automatically fallback to JSON if offline)
connectDB();

// Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend in production (optional, we serve via API routes or Vite)
// We mount backend api routes
app.use('/api', require('./routes/api'));

// Root route - helpful redirect message
app.get('/', (req, res) => {
  res.send(`
    <html><body style="font-family:sans-serif;background:#090c15;color:#f3f4f6;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:16px;">
      <div style="font-size:3rem">🪄</div>
      <h1 style="margin:0;background:linear-gradient(135deg,#fff,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent">SQL Alchemy API Server</h1>
      <p style="color:#94a3b8;margin:0">This is the backend API. The app runs on the frontend.</p>
      <a href="http://localhost:5173" style="background:#8b5cf6;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;margin-top:8px">
        → Open SQL Alchemy App
      </a>
      <p style="color:#64748b;font-size:13px;margin:0">API available at <code style="color:#a78bfa">http://localhost:8000/api</code></p>
    </body></html>
  `);
});

// Serve frontend production build in production
const frontendBuild = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`SQL assistant Express Server running on port ${PORT}`);
  console.log(`API endpoints accessible at http://localhost:${PORT}/api`);
  console.log(`==================================================`);
});
