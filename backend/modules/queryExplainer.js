const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class QueryExplainer {
  constructor() {
    this.clauseExplanations = {
      'SELECT': 'retrieves data from the database',
      'FROM': 'specifies the table to query data from',
      'WHERE': 'filters records based on specified conditions',
      'JOIN': 'combines rows from two or more tables',
      'INNER JOIN': 'returns rows when there is a match in both tables',
      'LEFT JOIN': 'returns all rows from the left table and matching rows from the right',
      'RIGHT JOIN': 'returns all rows from the right table and matching rows from the left',
      'GROUP BY': 'groups rows that have the same values',
      'HAVING': 'filters groups after GROUP BY',
      'ORDER BY': 'sorts the result set',
      'LIMIT': 'restricts the number of rows returned',
      'INSERT INTO': 'adds new records to a table',
      'UPDATE': 'modifies existing records in a table',
      'DELETE': 'removes records from a table',
      'DISTINCT': 'returns only unique values',
      'COUNT': 'counts the number of rows',
      'SUM': 'calculates the total of values',
      'AVG': 'calculates the average of values',
      'MAX': 'finds the maximum value',
      'MIN': 'finds the minimum value'
    };
  }

  async explain(sql, provider = null) {
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!provider) {
      if (geminiKey) provider = 'gemini';
      else if (openaiKey) provider = 'openai';
      else provider = 'rules';
    }

    if (provider === 'openai' && openaiKey) {
      return this._explainWithOpenAI(sql, openaiKey);
    } else if (provider === 'gemini' && geminiKey) {
      return this._explainWithGemini(sql, geminiKey);
    } else {
      return this._explainWithRules(sql);
    }
  }

  _getPrompt(sql) {
    return `You are an expert database instructor. 
Provide a clear, simple, and detailed explanation of the following SQL query.

Query:
${sql}

Write your explanation in clean markdown. It must contain:
1. A **Summary**: A simple, 1-2 sentence explanation of what this query accomplishes in plain English.
2. **Breakdown of Key Clauses**: Bullet points explaining what each clause (SELECT, FROM, WHERE, JOIN, ORDER BY, LIMIT, etc.) does in this specific query.
3. **Tables & Fields Affected**: Clearly list the tables and fields involved.
4. **Highlights**: Point out any aggregations, filters, or performance impacts if applicable (e.g. full table scan, index potential).

Make sure the tone is helpful and educational.`;
  }

  async _explainWithOpenAI(sql, apiKey) {
    try {
      const openai = new OpenAI({ apiKey });
      const prompt = this._getPrompt(sql);

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a database instructor that explains SQL queries in detail using Markdown.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 600
      });
      return response.choices[0].message.content.trim();
    } catch (err) {
      console.error('OpenAI explanation failed:', err.message);
      return this._explainWithRules(sql);
    }
  }

  async _explainWithGemini(sql, apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const prompt = this._getPrompt(sql);

      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (err) {
      console.error('Gemini explanation failed:', err.message);
      return this._explainWithRules(sql);
    }
  }

  _explainWithRules(sql) {
    const sqlUpper = sql.toUpperCase();
    const parts = [];

    // Summary
    if (sqlUpper.trim().startsWith('SELECT')) {
      parts.push('### Summary\nThis query **retrieves records** from the database based on specified conditions.');
    } else if (sqlUpper.trim().startsWith('INSERT')) {
      parts.push('### Summary\nThis query **adds new records** into the database.');
    } else if (sqlUpper.trim().startsWith('UPDATE')) {
      parts.push('### Summary\nThis query **modifies existing records** in the database.');
    } else if (sqlUpper.trim().startsWith('DELETE')) {
      parts.push('### Summary\nThis query **permanently deletes records** from the database.');
    } else {
      parts.push('### Summary\nThis is a standard SQL statement.');
    }

    // Key clauses
    const clausesFound = [];
    for (const [clause, exp] of Object.entries(this.clauseExplanations)) {
      const rx = new RegExp(`\\b${clause}\\b`, 'i');
      if (rx.test(sqlUpper)) {
        clausesFound.push(`- **${clause}**: ${exp}`);
      }
    }

    if (clausesFound.length > 0) {
      parts.push('\n### Key Clauses Used:');
      parts.push(...clausesFound);
    }

    // Tables
    const tables = this._extractTables(sql);
    if (tables.length > 0) {
      parts.push(`\n### Tables Involved:\n- ${tables.join(', ')}`);
    }

    // Conditions
    const conditions = this._extractConditions(sql);
    if (conditions.length > 0) {
      parts.push('\n### Conditions Applied:');
      conditions.forEach(cond => {
        parts.push(`- filters rows where: \`${cond}\``);
      });
    }

    // Joins
    const joins = this._extractJoins(sql);
    if (joins.length > 0) {
      parts.push(`\n### Joins utilized:\n- ${joins.join(', ')}`);
    }

    return parts.join('\n');
  }

  _extractTables(sql) {
    const tables = [];
    const patterns = [
      /FROM\s+(\w+)/gi,
      /JOIN\s+(\w+)/gi,
      /UPDATE\s+(\w+)/gi,
      /INSERT\s+INTO\s+(\w+)/gi
    ];

    for (const rx of patterns) {
      const matches = [...sql.matchAll(rx)];
      matches.forEach(m => tables.push(m[1]));
    }

    return [...new Set(tables)];
  }

  _extractConditions(sql) {
    const rx = /WHERE\s+([\s\S]*?)(?:GROUP BY|ORDER BY|LIMIT|;|$)/i;
    const match = sql.match(rx);
    if (match) {
      const clauses = match[1].trim();
      return clauses
        .split(/\s+AND\s+|\s+OR\s+/i)
        .map(c => c.trim())
        .filter(Boolean)
        .slice(0, 3); // top 3 conditions
    }
    return [];
  }

  _extractJoins(sql) {
    const joins = [];
    const types = ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'JOIN'];
    
    types.forEach(type => {
      const rx = new RegExp(`\\b${type}\\b`, 'i');
      if (rx.test(sql)) {
        joins.push(type);
      }
    });
    
    return joins;
  }
}

module.exports = new QueryExplainer();
