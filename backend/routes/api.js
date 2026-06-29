const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Import modules
const dbManager = require('../modules/dbManager');
const queryGenerator = require('../modules/queryGenerator');
const queryExplainer = require('../modules/queryExplainer');
const queryAnalyzer = require('../modules/queryAnalyzer');
const queryValidator = require('../modules/queryValidator');
const History = require('../models/History');

const envPath = path.resolve(__dirname, '../.env');

// Helper to write keys to .env and refresh process.env
const saveEnvKeys = (openaiKey, geminiKey) => {
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
  } else {
    content = 'PORT=8000\nMONGODB_URI=mongodb://127.0.0.1:27017/sql_query_generator\n';
  }

  const updateKey = (key, value) => {
    const rx = new RegExp(`^${key}=.*$`, 'm');
    if (rx.test(content)) {
      content = content.replace(rx, `${key}=${value}`);
    } else {
      content = content.trim() + `\n${key}=${value}`;
    }
  };

  if (openaiKey !== undefined) {
    updateKey('OPENAI_API_KEY', openaiKey.trim());
    process.env.OPENAI_API_KEY = openaiKey.trim();
  }
  if (geminiKey !== undefined) {
    updateKey('GEMINI_API_KEY', geminiKey.trim());
    process.env.GEMINI_API_KEY = geminiKey.trim();
  }

  fs.writeFileSync(envPath, content.trim() + '\n', 'utf8');
  
  // Reload environment configurations
  dotenv.config({ path: envPath });
};

// ==========================================================================
// API Handlers
// ==========================================================================

// GET /api/status - Retrieve configuration status
router.get('/status', (req, res) => {
  res.json({
    active_schema: dbManager.activeSchemaName,
    openai_configured: !!process.env.OPENAI_API_KEY,
    gemini_configured: !!process.env.GEMINI_API_KEY
  });
});

// POST /api/settings - Update credentials
router.post('/settings', (req, res) => {
  const { openai_api_key, gemini_api_key } = req.body;
  try {
    saveEnvKeys(openai_api_key, gemini_api_key);
    res.json({
      success: true,
      message: 'API credentials saved successfully.',
      openai_configured: !!process.env.OPENAI_API_KEY,
      gemini_configured: !!process.env.GEMINI_API_KEY
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/db/schemas - Get mock databases list
router.get('/db/schemas', (req, res) => {
  const schemas = Object.entries(dbManager.mockSchemas).map(([key, val]) => ({
    key,
    name: val.name,
    tables: Object.keys(val.tables)
  }));
  res.json(schemas);
});

// POST /api/db/test - Test credentials
router.post('/db/test', async (req, res) => {
  const result = await dbManager.testConnection(req.body);
  res.json(result);
});

// POST /api/db/connect - Connect active database
router.post('/db/connect', async (req, res) => {
  const { type, database } = req.body;
  let result;
  
  if (type === 'mock') {
    result = await dbManager.connectMock(database);
  } else {
    result = await dbManager.connectReal(req.body);
  }

  if (!result.success) {
    return res.status(400).json({ success: false, message: result.message });
  }
  
  res.json(result);
});

// POST /api/generate-query - Compile SQL and assess impact
router.post('/generate-query', async (req, res) => {
  const { natural_language, provider } = req.body;
  
  try {
    const schemaContext = await dbManager.getSchemaContextText();
    const rawOptions = await queryGenerator.generate(natural_language, schemaContext, provider);

    const options = [];
    for (const opt of rawOptions) {
      const sql = opt.sql;
      const validation = await queryValidator.validate(sql, dbManager.activeClient, dbManager.activeType);
      const explanation = await queryExplainer.explain(sql, provider);
      const analysis = queryAnalyzer.analyze(sql, schemaContext);

      options.push({
        sql: sql,
        explanation: explanation,
        confidence: opt.confidence || 'medium',
        query_type: opt.query_type || 'SELECT',
        validation,
        analysis
      });
    }

    res.json({
      queries: options,
      active_schema_name: dbManager.activeSchemaName
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/db/execute - Execute query and log it
router.post('/db/execute', async (req, res) => {
  const { sql, prompt } = req.body;

  try {
    const result = await dbManager.executeQuery(sql);
    const status = result.success ? 'SUCCESS' : 'ERROR';
    const errMessage = result.success ? null : result.message;

    // Log the execution to DB or JSON fallback file
    await History.saveLog({
      prompt: prompt || 'Direct execution',
      sqlQuery: sql,
      schemaName: dbManager.activeSchemaName,
      status: status,
      rowsAffected: result.rows_affected || 0,
      executionTimeMs: result.execution_time_ms || 0.0,
      errorMessage: errMessage
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/history - Fetch query execution history logs
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const logs = await History.getLogs(limit);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/history/clear - Clear query logs
router.post('/history/clear', async (req, res) => {
  try {
    await History.clearLogs();
    res.json({ success: true, message: 'Execution history logs cleared successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/validate-query - Validate query only
router.post('/validate-query', async (req, res) => {
  const { sql } = req.body;
  try {
    const val = await queryValidator.validate(sql, dbManager.activeClient, dbManager.activeType);
    res.json(val);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/db/schema - Full schema metadata of active database
router.get('/db/schema', async (req, res) => {
  try {
    const meta = await dbManager.getSchemaMetadata();
    res.json(meta);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/db/table/:name - Get paginated rows from a specific table
router.get('/db/table/:name', async (req, res) => {
  const { name } = req.params;
  const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
  const limit = Math.min(200, parseInt(req.query.limit, 10) || 100);
  const offset = (page - 1) * limit;

  try {
    // Sanitise table name (only allow word chars)
    if (!/^\w+$/.test(name)) {
      return res.status(400).json({ success: false, message: 'Invalid table name.' });
    }

    const rowsResult  = await dbManager.executeQuery(`SELECT * FROM ${name} LIMIT ${limit} OFFSET ${offset};`);
    const countResult = await dbManager.executeQuery(`SELECT COUNT(*) AS total FROM ${name};`);
    const total = countResult.rows?.[0]?.total ?? countResult.rows?.[0]?.['COUNT(*)'] ?? 0;

    res.json({
      success: true,
      table: name,
      columns: rowsResult.columns || [],
      rows: rowsResult.rows || [],
      total,
      page,
      limit
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/db/table/:name/insert - Insert a new row into a table
router.post('/db/table/:name/insert', async (req, res) => {
  const { name } = req.params;
  const { row }  = req.body;

  if (!row || typeof row !== 'object' || Object.keys(row).length === 0) {
    return res.status(400).json({ success: false, message: 'Row data is required.' });
  }
  if (!/^\w+$/.test(name)) {
    return res.status(400).json({ success: false, message: 'Invalid table name.' });
  }

  try {
    const cols = Object.keys(row);
    const vals = Object.values(row).map(v => {
      if (v === null || v === undefined || v === '') return 'NULL';
      if (typeof v === 'number') return v;
      return `'${String(v).replace(/'/g, "''")}'`;
    });

    const sql = `INSERT INTO ${name} (${cols.join(', ')}) VALUES (${vals.join(', ')});`;
    const result = await dbManager.executeQuery(sql);

    res.json({ success: result.success, message: result.success ? `Row inserted into ${name}.` : result.message, rows_affected: result.rows_affected || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/db/table/:name/delete - Delete a row by primary key
router.delete('/db/table/:name/delete', async (req, res) => {
  const { name }               = req.params;
  const { pk_column, pk_value } = req.body;

  if (!pk_column || pk_value === undefined) {
    return res.status(400).json({ success: false, message: 'pk_column and pk_value are required.' });
  }
  if (!/^\w+$/.test(name) || !/^\w+$/.test(pk_column)) {
    return res.status(400).json({ success: false, message: 'Invalid table or column name.' });
  }

  try {
    const safeVal = typeof pk_value === 'number' ? pk_value : `'${String(pk_value).replace(/'/g, "''")}'`;
    const sql = `DELETE FROM ${name} WHERE ${pk_column} = ${safeVal};`;
    const result = await dbManager.executeQuery(sql);

    res.json({ success: result.success, message: result.success ? `Row deleted from ${name}.` : result.message, rows_affected: result.rows_affected || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
