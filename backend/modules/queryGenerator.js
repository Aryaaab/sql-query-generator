const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class QueryGenerator {
  constructor() {}

  async generate(naturalLanguage, schemaContext = null, provider = null) {
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    // Detect best provider if not chosen
    if (!provider) {
      if (geminiKey) {
        provider = 'gemini';
      } else if (openaiKey) {
        provider = 'openai';
      } else {
        provider = 'rules';
      }
    }

    if (provider === 'openai' && openaiKey) {
      return this._generateWithOpenAI(naturalLanguage, schemaContext, openaiKey);
    } else if (provider === 'gemini' && geminiKey) {
      return this._generateWithGemini(naturalLanguage, schemaContext, geminiKey);
    } else {
      return this._generateWithRules(naturalLanguage, schemaContext);
    }
  }

  _getSystemPrompt(schemaContext) {
    const schemaInfo = schemaContext 
      ? `\nDatabase Schema Context:\n${schemaContext}` 
      : `\nNo Database Schema loaded. Guess standard tables like Employees, Students, Products, etc.`;

    return `You are an elite SQL database expert assistant.
Convert the user's natural language request into 1 to 3 valid SQL queries.

If the user's prompt is ambiguous or can be solved in multiple ways, return multiple distinct query variations (up to 3).
If the prompt is straightforward, 1 or 2 options is fine.

For each query, provide:
1. The raw executable SQL statement (formatted cleanly, single-line or multi-line).
2. A simple, easy-to-understand explanation of what the query does.
3. Confidence level ("high", "medium", or "low") representing how likely this is the query the user wants.
4. The type of query ("SELECT", "INSERT", "UPDATE", or "DELETE").

${schemaInfo}

CRITICAL RULES:
- Use exact table names and column names provided in the schema context.
- If no schema context is provided, use logical placeholders or generic schemas.
- Ensure the SQL syntax matches standard SQL (MySQL/PostgreSQL/SQLite compatible).
- DO NOT wrap the JSON inside any explanatory markdown text. Return ONLY a valid JSON array.

RESPONSE FORMAT:
[
  {
    "sql": "SELECT * FROM Employees WHERE Salary > 50000;",
    "explanation": "Retrieves all columns from the Employees table for records where the Salary is greater than 50,000.",
    "confidence": "high",
    "query_type": "SELECT"
  }
]`;
  }

  async _generateWithOpenAI(naturalLanguage, schemaContext, apiKey) {
    try {
      const openai = new OpenAI({ apiKey });
      const systemPrompt = this._getSystemPrompt(schemaContext);

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a SQL query generator. Always output valid JSON only.' },
          { role: 'user', content: `${systemPrompt}\n\nRequest: ${naturalLanguage}\n\nGenerate JSON response:` }
        ],
        temperature: 0.2,
        max_tokens: 1000
      });

      const content = response.choices[0].message.content;
      return this._parseAiJson(content);
    } catch (err) {
      console.error('OpenAI generation failed:', err.message);
      return this._generateWithRules(naturalLanguage, schemaContext);
    }
  }

  async _generateWithGemini(naturalLanguage, schemaContext, apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const systemPrompt = this._getSystemPrompt(schemaContext);
      
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: 'You are a SQL query generator. Always output valid JSON only.'
      });

      const prompt = `${systemPrompt}\n\nRequest: ${naturalLanguage}\n\nGenerate JSON response:`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();
      
      return this._parseAiJson(content);
    } catch (err) {
      console.error('Gemini generation failed:', err.message);
      return this._generateWithRules(naturalLanguage, schemaContext);
    }
  }

  _parseAiJson(text) {
    let cleanText = text.trim();
    
    // Strip markdown blocks e.g. ```json ... ```
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(?:json)?\s*/i, '');
      cleanText = cleanText.replace(/\s*```$/i, '');
    }
    
    cleanText = cleanText.trim();
    
    try {
      const parsed = JSON.parse(cleanText);
      if (Array.isArray(parsed)) {
        return parsed;
      } else if (typeof parsed === 'object' && parsed !== null) {
        return [parsed];
      }
      return [];
    } catch (err) {
      console.error('Failed to parse JSON from AI response:', err.message);
      console.log('Raw output was:', text);
      throw err;
    }
  }

  _generateWithRules(naturalLanguage, schemaContext = null) {
    const queries = [];
    const nlLower = naturalLanguage.toLowerCase();
    let queryType = 'SELECT';

    // 1. Detect query type
    if (/\b(show|display|get|find|list|retrieve|select)\b/i.test(nlLower)) {
      queryType = 'SELECT';
    } else if (/\b(add|insert|create|new)\b/i.test(nlLower)) {
      queryType = 'INSERT';
    } else if (/\b(update|change|modify|set|increase|decrease)\b/i.test(nlLower)) {
      queryType = 'UPDATE';
    } else if (/\b(delete|remove|drop)\b/i.test(nlLower)) {
      queryType = 'DELETE';
    }

    // 2. Extract table name matching schema
    let table = null;
    if (schemaContext) {
      const tableMatches = [...schemaContext.matchAll(/Table:\s*(\w+)/gi)];
      for (const m of tableMatches) {
        if (nlLower.includes(m[1].toLowerCase())) {
          table = m[1];
          break;
        }
      }
    }

    if (!table) {
      const commonTables = ['employees', 'employee', 'students', 'student', 'departments', 'department', 
                            'products', 'product', 'customers', 'customer', 'orders', 'order', 'enrollments'];
      for (const t of commonTables) {
        if (nlLower.includes(t)) {
          table = t;
          break;
        }
      }
    }
    if (!table) table = 'employees';

    // 3. Extract field name matching schema
    let field = null;
    if (schemaContext && table) {
      const rx = new RegExp(`Table:\\s*${table}\\b[\\s\\S]*?(?:\\n\\n|$)`, 'i');
      const block = schemaContext.match(rx);
      if (block) {
        const cols = [...block[0].matchAll(/-\s*(\w+)/g)].map(m => m[1]);
        for (const c of cols) {
          if (nlLower.includes(c.toLowerCase())) {
            field = c;
            break;
          }
        }
      }
    }

    if (!field) {
      const commonFields = ['salary', 'age', 'price', 'quantity', 'cgpa', 'grade', 'name', 'id', 'date', 'stock', 'major'];
      for (const f of commonFields) {
        if (nlLower.includes(f)) {
          field = f;
          break;
        }
      }
    }
    if (!field) field = 'id';

    // 4. Draft simple query variations
    if (queryType === 'SELECT') {
      if (nlLower.includes('greater than') || nlLower.includes('>')) {
        const num = (naturalLanguage.match(/\d+/) || ['50000'])[0];
        queries.push({
          sql: `SELECT * FROM ${table} WHERE ${field} > ${num};`,
          explanation: `Retrieves records from ${table} where ${field} is greater than ${num}.`,
          confidence: 'medium',
          query_type: 'SELECT'
        });
      } else if (nlLower.includes('less than') || nlLower.includes('<')) {
        const num = (naturalLanguage.match(/\d+/) || ['50000'])[0];
        queries.push({
          sql: `SELECT * FROM ${table} WHERE ${field} < ${num};`,
          explanation: `Retrieves records from ${table} where ${field} is less than ${num}.`,
          confidence: 'medium',
          query_type: 'SELECT'
        });
      } else if (/\b(top|limit|highest|lowest)\b/i.test(nlLower)) {
        const limit = (naturalLanguage.match(/\d+/) || ['5'])[0];
        const sort = /\b(highest|top)\b/i.test(nlLower) ? 'DESC' : 'ASC';
        queries.push({
          sql: `SELECT * FROM ${table} ORDER BY ${field} ${sort} LIMIT ${limit};`,
          explanation: `Returns the top ${limit} records from ${table} sorted by ${field} in ${sort}ending order.`,
          confidence: 'medium',
          query_type: 'SELECT'
        });
      } else {
        queries.push({
          sql: `SELECT * FROM ${table};`,
          explanation: `Retrieves all rows and columns from the ${table} table.`,
          confidence: 'medium',
          query_type: 'SELECT'
        });
      }
    } 
    
    else if (queryType === 'UPDATE') {
      const num = (naturalLanguage.match(/\d+/) || ['10'])[0];
      const isPercent = nlLower.includes('%') || nlLower.includes('percent');
      
      let filter = '';
      if (nlLower.includes('department')) filter = ' WHERE department_id = 101';
      else if (nlLower.includes('major')) filter = " WHERE major = 'Computer Science'";

      if (nlLower.includes('increase') || nlLower.includes('raise')) {
        const expr = isPercent ? `${field} * ${1 + parseFloat(num)/100}` : `${field} + ${num}`;
        queries.push({
          sql: `UPDATE ${table} SET ${field} = ${expr}${filter};`,
          explanation: `Increases the value of ${field} in ${table} table${filter ? ' matching filter' : ''}.`,
          confidence: 'medium',
          query_type: 'UPDATE'
        });
      } else {
        queries.push({
          sql: `UPDATE ${table} SET ${field} = ${num}${filter};`,
          explanation: `Sets the value of ${field} to ${num} in ${table} table${filter ? ' matching filter' : ''}.`,
          confidence: 'medium',
          query_type: 'UPDATE'
        });
      }
    } 
    
    else if (queryType === 'INSERT') {
      queries.push({
        sql: `INSERT INTO ${table} (name, ${field}) VALUES ('New Record', 100);`,
        explanation: `Inserts a new default row into the ${table} table.`,
        confidence: 'medium',
        query_type: 'INSERT'
      });
    } 
    
    else if (queryType === 'DELETE') {
      const num = (naturalLanguage.match(/\d+/) || ['1'])[0];
      queries.push({
        sql: `DELETE FROM ${table} WHERE ${field} = ${num};`,
        explanation: `Deletes records from the ${table} table where ${field} equals ${num}.`,
        confidence: 'medium',
        query_type: 'DELETE'
      });
    }

    return queries;
  }
}

module.exports = new QueryGenerator();
