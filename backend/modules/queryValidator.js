const { format } = require('sql-formatter');

class QueryValidator {
  constructor() {}

  async validate(sql, activeClient = null, activeType = null) {
    const validationResult = {
      is_valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // 1. Basic character checks
    const syntaxErrors = this._checkSyntax(sql);
    validationResult.errors.push(...syntaxErrors);

    // 2. Compilation check against active SQL database
    if (activeClient && activeType && validationResult.errors.length === 0) {
      const dbErrors = await this._checkWithDB(sql, activeClient, activeType);
      if (dbErrors.length > 0) {
        validationResult.errors.push(...dbErrors);
      }
    }

    if (validationResult.errors.length > 0) {
      validationResult.is_valid = false;
    }

    // 3. Check for general semantic warnings
    const issues = this._checkCommonIssues(sql);
    validationResult.warnings.push(...issues);

    // 4. Suggest indices or optimizations
    const suggestions = this._suggestOptimizations(sql);
    validationResult.suggestions.push(...suggestions);

    return validationResult;
  }

  _checkSyntax(sql) {
    const errors = [];
    const sqlUpper = sql.toUpperCase().trim();

    if (!sql.trim()) {
      errors.push('Empty query. Please provide SQL statement.');
      return errors;
    }

    // Parentheses balance
    if ((sql.match(/\(/g) || []).length !== (sql.match(/\)/g) || []).length) {
      errors.push('Syntax Error: Unbalanced parentheses in query.');
    }

    // Quotes balance
    if ((sql.match(/'/g) || []).length % 2 !== 0) {
      errors.push("Syntax Error: Unclosed single quote (') in query.");
    }
    if ((sql.match(/"/g) || []).length % 2 !== 0) {
      errors.push('Syntax Error: Unclosed double quote (") in query.');
    }

    // Incomplete clauses
    if (sqlUpper.startsWith('SELECT') && !sqlUpper.includes('FROM')) {
      errors.push('Syntax Error: SELECT statement is missing a FROM clause.');
    }

    if (sqlUpper.startsWith('INSERT') && !sqlUpper.includes('VALUES') && !sqlUpper.includes('SELECT')) {
      errors.push('Syntax Error: INSERT statement is missing a VALUES or SELECT clause.');
    }

    if (sqlUpper.startsWith('UPDATE') && !sqlUpper.includes('SET')) {
      errors.push('Syntax Error: UPDATE statement is missing a SET clause.');
    }

    if (sqlUpper.startsWith('DELETE') && !sqlUpper.includes('FROM')) {
      if (!/DELETE\s+\w+\s+FROM/i.test(sqlUpper)) {
        errors.push('Syntax Error: DELETE statement is missing a FROM clause.');
      }
    }

    return errors;
  }

  async _checkWithDB(sql, client, type) {
    const errors = [];
    const sqlStripped = sql.trim().replace(/;$/, '');

    // SQLite explain write operations are hard, ignore those
    if (type === 'mock' || type === 'sqlite') {
      if (!sqlStripped.toUpperCase().startsWith('SELECT')) {
        return errors;
      }
    }

    try {
      const explainQuery = `EXPLAIN ${sqlStripped}`;
      
      if (type === 'sqlite' || type === 'mock') {
        await new Promise((resolve, reject) => {
          client.all(explainQuery, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
      } 
      
      else if (type === 'mysql') {
        await client.query(explainQuery);
      } 
      
      else if (type === 'postgresql') {
        await client.query(explainQuery);
      }
    } catch (err) {
      // Clean up JDBC/SQL database driver wrapper errors
      let errMsg = err.message;
      if (errMsg.includes('sqlMessage')) {
        errMsg = err.sqlMessage;
      }
      errors.push(`Database Compilation Error: ${errMsg}`);
    }

    return errors;
  }

  _checkCommonIssues(sql) {
    const issues = [];
    const sqlUpper = sql.toUpperCase();

    if (sqlUpper.includes('SELECT *')) {
      issues.push('Using SELECT * can impact performance by fetching unnecessary columns. Consider specifying columns explicitly.');
    }

    if ((sqlUpper.startsWith('UPDATE') || sqlUpper.startsWith('DELETE')) && !sqlUpper.includes('WHERE')) {
      issues.push('Safety Warning: Missing WHERE clause in UPDATE/DELETE statement will affect all rows.');
    }

    if (sqlUpper.includes(' LIKE ') && !sql.includes('%') && !sql.includes('_')) {
      issues.push("Semantics: LIKE keyword used without wildcards (% or _). This acts as a standard '=' operator.");
    }

    if (sql.includes('= ') && !sql.includes("'") && !sql.includes('"')) {
      const parts = sql.split('=');
      if (parts.length > 1) {
        const right = parts[1].trim().split(/\s+/)[0].replace(/;$/, '');
        if (/^[a-zA-Z]+$/.test(right) && !['TRUE', 'FALSE', 'NULL'].includes(right.toUpperCase())) {
          issues.push('Type Warning: String comparison value should be enclosed in quotes.');
        }
      }
    }

    return issues;
  }

  _suggestOptimizations(sql) {
    const suggestions = [];
    const sqlUpper = sql.toUpperCase();

    if (sqlUpper.startsWith('SELECT') && !sqlUpper.includes('LIMIT') && !sqlUpper.includes('TOP')) {
      suggestions.push('Consider adding a LIMIT clause to restrict result set size and avoid large table scans.');
    }

    if (sqlUpper.includes('WHERE')) {
      suggestions.push('Ensure columns used in the WHERE filters are indexed to optimize speed.');
    }

    if (sqlUpper.includes(' IN (') && sqlUpper.includes('SELECT')) {
      suggestions.push('Optimize: Consider using EXISTS instead of IN for subqueries on large datasets.');
    }

    if ((sqlUpper.match(/\bSELECT\b/g) || []).length > 1 && !sqlUpper.includes('JOIN')) {
      suggestions.push('Refactor: Consider converting nested SELECT subqueries into JOINs for better readability and indexing support.');
    }

    if (sqlUpper.includes('DISTINCT')) {
      suggestions.push('Performance: Use DISTINCT only when duplicate records are guaranteed, as sorting/deduplication adds CPU overhead.');
    }

    return suggestions;
  }

  formatQuery(sql, dialect = 'sql') {
    try {
      let lang = 'sql';
      if (dialect === 'mysql') lang = 'mysql';
      if (dialect === 'postgresql') lang = 'postgresql';
      if (dialect === 'sqlite' || dialect === 'mock') lang = 'sqlite';

      return format(sql, { language: lang, keywordCase: 'upper' });
    } catch (err) {
      return sql;
    }
  }
}

module.exports = new QueryValidator();
