const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2/promise');
const { Client } = require('pg');

class DatabaseManager {
  constructor() {
    this.activeClient = null;
    this.activeType = null; // 'mysql' | 'postgresql' | 'sqlite' | 'mock'
    this.activeSchemaName = 'HR Company Database';
    this.activeConfig = {};
    
    this.mockDir = path.join(__dirname, '../mock_databases');
    if (!fs.existsSync(this.mockDir)) {
      fs.mkdirSync(this.mockDir, { recursive: true });
    }
    
    // Mock schemas configurations
    this.mockSchemas = {
      hr_company: {
        name: 'HR & Company Database',
        tables: {
          departments: `
            CREATE TABLE IF NOT EXISTS departments (
              id INTEGER PRIMARY KEY,
              name TEXT NOT NULL,
              manager_id INTEGER,
              location TEXT
            );
          `,
          employees: `
            CREATE TABLE IF NOT EXISTS employees (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              department_id INTEGER,
              salary REAL,
              hire_date TEXT,
              FOREIGN KEY (department_id) REFERENCES departments(id)
            );
          `
        },
        data: [
          "INSERT OR IGNORE INTO departments (id, name, manager_id, location) VALUES (101, 'IT', 1, 'San Francisco');",
          "INSERT OR IGNORE INTO departments (id, name, manager_id, location) VALUES (102, 'HR', 3, 'New York');",
          "INSERT OR IGNORE INTO departments (id, name, manager_id, location) VALUES (103, 'Finance', 4, 'London');",
          "INSERT OR IGNORE INTO departments (id, name, manager_id, location) VALUES (104, 'Sales', 6, 'Chicago');",
          
          "INSERT OR IGNORE INTO employees (id, name, department_id, salary, hire_date) VALUES (1, 'Alice Smith', 101, 75000.00, '2022-01-15');",
          "INSERT OR IGNORE INTO employees (id, name, department_id, salary, hire_date) VALUES (2, 'Bob Jones', 101, 62000.00, '2023-03-10');",
          "INSERT OR IGNORE INTO employees (id, name, department_id, salary, hire_date) VALUES (3, 'Carol Taylor', 102, 55000.00, '2021-06-01');",
          "INSERT OR IGNORE INTO employees (id, name, department_id, salary, hire_date) VALUES (4, 'David Miller', 103, 90000.00, '2020-11-20');",
          "INSERT OR IGNORE INTO employees (id, name, department_id, salary, hire_date) VALUES (5, 'Eva Green', 101, 82000.00, '2022-05-18');",
          "INSERT OR IGNORE INTO employees (id, name, department_id, salary, hire_date) VALUES (6, 'Frank Wright', 104, 48000.00, '2024-02-01');",
          "INSERT OR IGNORE INTO employees (id, name, department_id, salary, hire_date) VALUES (7, 'Grace Lee', 104, 52000.00, '2023-09-15');"
        ]
      },
      university: {
        name: 'University Registrar Database',
        tables: {
          students: `
            CREATE TABLE IF NOT EXISTS students (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              cgpa REAL,
              major TEXT,
              enrollment_year INTEGER
            );
          `,
          courses: `
            CREATE TABLE IF NOT EXISTS courses (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              credits INTEGER,
              department TEXT
            );
          `,
          enrollments: `
            CREATE TABLE IF NOT EXISTS enrollments (
              student_id INTEGER,
              course_id TEXT,
              grade TEXT,
              PRIMARY KEY (student_id, course_id),
              FOREIGN KEY (student_id) REFERENCES students(id),
              FOREIGN KEY (course_id) REFERENCES courses(id)
            );
          `
        },
        data: [
          "INSERT OR IGNORE INTO students (id, name, cgpa, major, enrollment_year) VALUES (1, 'John Doe', 3.80, 'Computer Science', 2023);",
          "INSERT OR IGNORE INTO students (id, name, cgpa, major, enrollment_year) VALUES (2, 'Jane Smith', 3.95, 'Mathematics', 2022);",
          "INSERT OR IGNORE INTO students (id, name, cgpa, major, enrollment_year) VALUES (3, 'Michael Brown', 3.20, 'Physics', 2024);",
          "INSERT OR IGNORE INTO students (id, name, cgpa, major, enrollment_year) VALUES (4, 'Emily Davis', 3.55, 'Computer Science', 2023);",
          "INSERT OR IGNORE INTO students (id, name, cgpa, major, enrollment_year) VALUES (5, 'William Wilson', 2.90, 'History', 2022);",
          
          "INSERT OR IGNORE INTO courses (id, title, credits, department) VALUES ('CS101', 'Intro to Computer Science', 4, 'Computer Science');",
          "INSERT OR IGNORE INTO courses (id, title, credits, department) VALUES ('MATH201', 'Calculus II', 3, 'Mathematics');",
          "INSERT OR IGNORE INTO courses (id, title, credits, department) VALUES ('PHYS101', 'General Physics I', 4, 'Physics');",
          "INSERT OR IGNORE INTO courses (id, title, credits, department) VALUES ('HIST102', 'World History', 3, 'History');",
          
          "INSERT OR IGNORE INTO enrollments (student_id, course_id, grade) VALUES (1, 'CS101', 'A');",
          "INSERT OR IGNORE INTO enrollments (student_id, course_id, grade) VALUES (1, 'MATH201', 'B+');",
          "INSERT OR IGNORE INTO enrollments (student_id, course_id, grade) VALUES (2, 'MATH201', 'A');",
          "INSERT OR IGNORE INTO enrollments (student_id, course_id, grade) VALUES (3, 'PHYS101', 'B');",
          "INSERT OR IGNORE INTO enrollments (student_id, course_id, grade) VALUES (4, 'CS101', 'A-');",
          "INSERT OR IGNORE INTO enrollments (student_id, course_id, grade) VALUES (4, 'MATH201', 'B');",
          "INSERT OR IGNORE INTO enrollments (student_id, course_id, grade) VALUES (5, 'HIST102', 'C+');"
        ]
      },
      ecommerce: {
        name: 'E-Commerce Shop Database',
        tables: {
          customers: `
            CREATE TABLE IF NOT EXISTS customers (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              email TEXT UNIQUE,
              country TEXT
            );
          `,
          products: `
            CREATE TABLE IF NOT EXISTS products (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              price REAL,
              stock INTEGER,
              category TEXT
            );
          `,
          orders: `
            CREATE TABLE IF NOT EXISTS orders (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              customer_id INTEGER,
              order_date TEXT,
              total_amount REAL,
              FOREIGN KEY (customer_id) REFERENCES customers(id)
            );
          `,
          order_details: `
            CREATE TABLE IF NOT EXISTS order_details (
              order_id INTEGER,
              product_id INTEGER,
              quantity INTEGER,
              price REAL,
              PRIMARY KEY (order_id, product_id),
              FOREIGN KEY (order_id) REFERENCES orders(id),
              FOREIGN KEY (product_id) REFERENCES products(id)
            );
          `
        },
        data: [
          "INSERT OR IGNORE INTO customers (id, name, email, country) VALUES (1, 'James Bond', 'james@mi6.gov', 'UK');",
          "INSERT OR IGNORE INTO customers (id, name, email, country) VALUES (2, 'Sherlock Holmes', 'sherlock@bakerst.co.uk', 'UK');",
          "INSERT OR IGNORE INTO customers (id, name, email, country) VALUES (3, 'Bruce Wayne', 'bruce@wayne.corp', 'USA');",
          "INSERT OR IGNORE INTO customers (id, name, email, country) VALUES (4, 'Tony Stark', 'tony@stark.industries', 'USA');",
          "INSERT OR IGNORE INTO customers (id, name, email, country) VALUES (5, 'Clark Kent', 'clark@dailyplanet.com', 'USA');",
          
          "INSERT OR IGNORE INTO products (id, name, price, stock, category) VALUES (1, 'Smartphone Alpha', 699.99, 50, 'Electronics');",
          "INSERT OR IGNORE INTO products (id, name, price, stock, category) VALUES (2, 'Laptop Pro 15', 1299.99, 20, 'Electronics');",
          "INSERT OR IGNORE INTO products (id, name, price, stock, category) VALUES (3, 'Leather Wallet', 45.00, 100, 'Accessories');",
          "INSERT OR IGNORE INTO products (id, name, price, stock, category) VALUES (4, 'Running Shoes', 89.99, 75, 'Footwear');",
          "INSERT OR IGNORE INTO products (id, name, price, stock, category) VALUES (5, 'Coffee Maker', 59.99, 30, 'Home Appliances');",
          
          "INSERT OR IGNORE INTO orders (id, customer_id, order_date, total_amount) VALUES (1001, 1, '2026-05-01', 744.99);",
          "INSERT OR IGNORE INTO orders (id, customer_id, order_date, total_amount) VALUES (1002, 3, '2026-05-15', 1389.98);",
          "INSERT OR IGNORE INTO orders (id, customer_id, order_date, total_amount) VALUES (1003, 4, '2026-06-01', 2059.97);",
          "INSERT OR IGNORE INTO orders (id, customer_id, order_date, total_amount) VALUES (1004, 2, '2026-06-10', 45.00);",
          "INSERT OR IGNORE INTO orders (id, customer_id, order_date, total_amount) VALUES (1005, 5, '2026-06-20', 149.98);",
          
          "INSERT OR IGNORE INTO order_details (order_id, product_id, quantity, price) VALUES (1001, 1, 1, 699.99);",
          "INSERT OR IGNORE INTO order_details (order_id, product_id, quantity, price) VALUES (1001, 3, 1, 45.00);",
          "INSERT OR IGNORE INTO order_details (order_id, product_id, quantity, price) VALUES (1002, 2, 1, 1299.99);",
          "INSERT OR IGNORE INTO order_details (order_id, product_id, quantity, price) VALUES (1002, 4, 1, 89.99);",
          "INSERT OR IGNORE INTO order_details (order_id, product_id, quantity, price) VALUES (1003, 2, 1, 1299.99);",
          "INSERT OR IGNORE INTO order_details (order_id, product_id, quantity, price) VALUES (1003, 1, 1, 699.99);",
          "INSERT OR IGNORE INTO order_details (order_id, product_id, quantity, price) VALUES (1003, 5, 1, 59.99);",
          "INSERT OR IGNORE INTO order_details (order_id, product_id, quantity, price) VALUES (1004, 3, 1, 45.00);",
          "INSERT OR IGNORE INTO order_details (order_id, product_id, quantity, price) VALUES (1005, 4, 1, 89.99);",
          "INSERT OR IGNORE INTO order_details (order_id, product_id, quantity, price) VALUES (1005, 5, 1, 59.99);"
        ]
      }
    };
    
    // Connect to HR mock db by default on setup
    this.connectMock('hr_company');
  }

  // Cleanup active connections
  async disconnectActive() {
    if (this.activeClient) {
      try {
        if (this.activeType === 'mysql') {
          await this.activeClient.end();
        } else if (this.activeType === 'postgresql') {
          await this.activeClient.end();
        } else if (this.activeType === 'sqlite' || this.activeType === 'mock') {
          await new Promise((resolve, reject) => {
            this.activeClient.close((err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }
      } catch (err) {
        console.error('Error disconnecting active database:', err);
      }
      this.activeClient = null;
    }
  }

  async testConnection(config) {
    const type = config.type.toLowerCase();
    try {
      if (type === 'mysql') {
        const conn = await mysql.createConnection({
          host: config.host || 'localhost',
          port: config.port || 3306,
          user: config.username || 'root',
          password: config.password || '',
          database: config.database,
          connectTimeout: 5000
        });
        await conn.ping();
        await conn.end();
        return { success: true, message: 'Connection successful' };
      } 
      
      else if (type === 'postgresql') {
        const client = new Client({
          host: config.host || 'localhost',
          port: config.port || 5432,
          user: config.username || 'postgres',
          password: config.password || '',
          database: config.database,
          connectionTimeoutMillis: 5000
        });
        await client.connect();
        await client.end();
        return { success: true, message: 'Connection successful' };
      } 
      
      else if (type === 'sqlite') {
        const dbPath = config.database || ':memory:';
        await new Promise((resolve, reject) => {
          const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
            if (err) reject(err);
            else {
              db.close();
              resolve();
            }
          });
        });
        return { success: true, message: 'Connection successful' };
      }
      
      return { success: false, message: `Unsupported database type: ${type}` };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  async connectMock(schemaKey) {
    if (!this.mockSchemas[schemaKey]) {
      return { success: false, message: 'Unknown mock database key' };
    }
    
    await this.disconnectActive();
    
    const dbPath = path.join(this.mockDir, `${schemaKey}.db`);
    const needsInit = !fs.existsSync(dbPath);
    
    try {
      const db = await new Promise((resolve, reject) => {
        const instance = new sqlite3.Database(dbPath, (err) => {
          if (err) reject(err);
          else resolve(instance);
        });
      });
      
      this.activeClient = db;
      this.activeType = 'mock';
      this.activeSchemaName = this.mockSchemas[schemaKey].name;
      this.activeConfig = { type: 'mock', database: dbPath };
      
      if (needsInit) {
        const schema = this.mockSchemas[schemaKey];
        await new Promise((resolve, reject) => {
          db.serialize(() => {
            // Create tables
            for (const tableDdl of Object.values(schema.tables)) {
              db.run(tableDdl, (err) => {
                if (err) return reject(err);
              });
            }
            // Populate mock data
            for (const insertDml of schema.data) {
              db.run(insertDml, (err) => {
                if (err) return reject(err);
              });
            }
            resolve();
          });
        });
      }
      
      const meta = await this.getSchemaMetadata();
      return { success: true, schema: meta, schema_name: this.activeSchemaName };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  async connectReal(config) {
    await this.disconnectActive();
    const type = config.type.toLowerCase();
    
    try {
      if (type === 'mysql') {
        const conn = await mysql.createConnection({
          host: config.host || 'localhost',
          port: config.port || 3306,
          user: config.username || 'root',
          password: config.password || '',
          database: config.database
        });
        this.activeClient = conn;
        this.activeType = 'mysql';
        this.activeSchemaName = `Real MySQL: ${config.database}`;
      } 
      
      else if (type === 'postgresql') {
        const client = new Client({
          host: config.host || 'localhost',
          port: config.port || 5432,
          user: config.username || 'postgres',
          password: config.password || '',
          database: config.database
        });
        await client.connect();
        this.activeClient = client;
        this.activeType = 'postgresql';
        this.activeSchemaName = `Real PostgreSQL: ${config.database}`;
      } 
      
      else if (type === 'sqlite') {
        const dbPath = config.database || ':memory:';
        const db = await new Promise((resolve, reject) => {
          const instance = new sqlite3.Database(dbPath, (err) => {
            if (err) reject(err);
            else resolve(instance);
          });
        });
        this.activeClient = db;
        this.activeType = 'sqlite';
        this.activeSchemaName = `Real SQLite: ${path.basename(dbPath)}`;
      }
      
      this.activeConfig = config;
      const meta = await this.getSchemaMetadata();
      return { success: true, schema: meta, schema_name: this.activeSchemaName };
    } catch (err) {
      this.activeClient = null;
      this.activeType = null;
      return { success: false, message: err.message };
    }
  }

  async getSchemaMetadata() {
    if (!this.activeClient) return { tables: [] };
    
    const tables = [];
    
    try {
      if (this.activeType === 'sqlite' || this.activeType === 'mock') {
        const db = this.activeClient;
        // 1. Get Table list
        const rows = await new Promise((resolve, reject) => {
          db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", (err, data) => {
            if (err) reject(err);
            else resolve(data);
          });
        });
        
        // 2. Fetch details for each table
        for (const r of rows) {
          const tblName = r.name;
          
          // Column info
          const colsInfo = await new Promise((resolve, reject) => {
            db.all(`PRAGMA table_info(${tblName})`, (err, data) => {
              if (err) reject(err);
              else resolve(data);
            });
          });
          
          // Foreign key info
          const fkeysInfo = await new Promise((resolve, reject) => {
            db.all(`PRAGMA foreign_key_list(${tblName})`, (err, data) => {
              if (err) reject(err);
              else resolve(data);
            });
          });
          
          const columns = colsInfo.map(c => ({
            name: c.name,
            type: c.type,
            nullable: c.notnull === 0,
            primary_key: c.pk === 1,
            default: c.dflt_value
          }));
          
          const foreignKeys = fkeysInfo.map(f => ({
            column: f.from,
            referred_table: f.table,
            referred_column: f.to
          }));
          
          tables.push({
            name: tblName,
            columns,
            foreign_keys: foreignKeys
          });
        }
      } 
      
      else if (this.activeType === 'mysql') {
        const conn = this.activeClient;
        const [tblRows] = await conn.query('SHOW TABLES');
        
        for (const r of tblRows) {
          const tblName = Object.values(r)[0];
          
          // Fetch columns info
          const [colsMeta] = await conn.query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
          `, [this.activeConfig.database, tblName]);
          
          // Fetch foreign keys
          const [fkeysMeta] = await conn.query(`
            SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL
          `, [this.activeConfig.database, tblName]);
          
          const columns = colsMeta.map(c => ({
            name: c.COLUMN_NAME,
            type: c.DATA_TYPE.toUpperCase(),
            nullable: c.IS_NULLABLE === 'YES',
            primary_key: c.COLUMN_KEY === 'PRI',
            default: c.COLUMN_DEFAULT
          }));
          
          const foreignKeys = fkeysMeta.map(f => ({
            column: f.COLUMN_NAME,
            referred_table: f.REFERENCED_TABLE_NAME,
            referred_column: f.REFERENCED_COLUMN_NAME
          }));
          
          tables.push({
            name: tblName,
            columns,
            foreign_keys: foreignKeys
          });
        }
      } 
      
      else if (this.activeType === 'postgresql') {
        const client = this.activeClient;
        
        const tblRes = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        `);
        
        for (const r of tblRes.rows) {
          const tblName = r.table_name;
          
          // Fetch columns
          const colsRes = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = $1
          `, [tblName]);
          
          // Fetch primary keys constraint
          const pkRes = await client.query(`
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = $1
          `, [tblName]);
          
          const pkCols = pkRes.rows.map(pk => pk.column_name);
          
          // Fetch foreign keys
          const fkRes = await client.query(`
            SELECT
                kcu.column_name AS column_name,
                ccu.table_name AS referenced_table_name,
                ccu.column_name AS referenced_column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1
          `, [tblName]);
          
          const columns = colsRes.rows.map(c => ({
            name: c.column_name,
            type: c.data_type.toUpperCase(),
            nullable: c.is_nullable === 'YES',
            primary_key: pkCols.includes(c.column_name),
            default: c.column_default
          }));
          
          const foreignKeys = fkRes.rows.map(f => ({
            column: f.column_name,
            referred_table: f.referenced_table_name,
            referred_column: f.referenced_column_name
          }));
          
          tables.push({
            name: tblName,
            columns,
            foreign_keys: foreignKeys
          });
        }
      }
    } catch (err) {
      console.error('Error fetching schema metadata:', err);
    }
    
    return { tables };
  }

  async getSchemaContextText() {
    const meta = await this.getSchemaMetadata();
    if (!meta.tables || meta.tables.length === 0) {
      return 'No schema metadata loaded.';
    }
    
    const context = [];
    for (const table of meta.tables) {
      const cols = table.columns.map(c => {
        const pk = c.primary_key ? ' [PK]' : '';
        const nulls = !c.nullable ? ' NOT NULL' : '';
        return `  - ${c.name} (${c.type})${pk}${nulls}`;
      }).join('\n');
      
      const fks = table.foreign_keys.map(f => {
        return `  - FOREIGN KEY (${f.column}) REFERENCES ${f.referred_table}(${f.referred_column})`;
      }).join('\n');
      
      let tableDesc = `Table: ${table.name}\nColumns:\n${cols}`;
      if (fks) {
        tableDesc += `\nRelationships:\n${fks}`;
      }
      context.push(tableDesc);
    }
    
    return context.join('\n\n');
  }

  async executeQuery(sql) {
    if (!this.activeClient) {
      return { success: false, message: 'No active database connection.' };
    }
    
    const sqlStripped = sql.trim();
    const isSelect = sqlStripped.toUpperCase().startsWith('SELECT');
    
    const startTime = process.hrtime();
    
    try {
      if (this.activeType === 'sqlite' || this.activeType === 'mock') {
        const db = this.activeClient;
        if (isSelect) {
          const rows = await new Promise((resolve, reject) => {
            db.all(sql, (err, data) => {
              if (err) reject(err);
              else resolve(data);
            });
          });
          
          const diff = process.hrtime(startTime);
          const elapsedMs = (diff[0] * 1000) + (diff[1] / 1000000);
          
          const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
          
          return {
            success: true,
            columns,
            rows,
            rows_affected: rows.length,
            execution_time_ms: elapsedMs
          };
        } 
        
        else {
          const info = await new Promise((resolve, reject) => {
            db.run(sql, function (err) {
              if (err) reject(err);
              else resolve(this); // 'this' contains changes and lastID
            });
          });
          
          const diff = process.hrtime(startTime);
          const elapsedMs = (diff[0] * 1000) + (diff[1] / 1000000);
          
          return {
            success: true,
            columns: [],
            rows: [],
            rows_affected: info.changes || 0,
            execution_time_ms: elapsedMs
          };
        }
      } 
      
      else if (this.activeType === 'mysql') {
        const conn = this.activeClient;
        const [results] = await conn.query(sql);
        
        const diff = process.hrtime(startTime);
        const elapsedMs = (diff[0] * 1000) + (diff[1] / 1000000);
        
        if (isSelect) {
          const columns = results.length > 0 ? Object.keys(results[0]) : [];
          return {
            success: true,
            columns,
            rows: results,
            rows_affected: results.length,
            execution_time_ms: elapsedMs
          };
        } else {
          return {
            success: true,
            columns: [],
            rows: [],
            rows_affected: results.affectedRows || 0,
            execution_time_ms: elapsedMs
          };
        }
      } 
      
      else if (this.activeType === 'postgresql') {
        const client = this.activeClient;
        const result = await client.query(sql);
        
        const diff = process.hrtime(startTime);
        const elapsedMs = (diff[0] * 1000) + (diff[1] / 1000000);
        
        if (isSelect) {
          const columns = result.fields.map(f => f.name);
          return {
            success: true,
            columns,
            rows: result.rows,
            rows_affected: result.rowCount || 0,
            execution_time_ms: elapsedMs
          };
        } else {
          return {
            success: true,
            columns: [],
            rows: [],
            rows_affected: result.rowCount || 0,
            execution_time_ms: elapsedMs
          };
        }
      }
      
      return { success: false, message: 'Unsupported active connection engine.' };
    } catch (err) {
      const diff = process.hrtime(startTime);
      const elapsedMs = (diff[0] * 1000) + (diff[1] / 1000000);
      return {
        success: false,
        message: err.message,
        execution_time_ms: elapsedMs
      };
    }
  }
}

// Singleton instance export
const managerInstance = new DatabaseManager();
module.exports = managerInstance;
