class QueryAnalyzer {
  constructor() {}

  analyze(sql, schemaContext = null) {
    const sqlUpper = sql.toUpperCase();
    const tables = this._extractTables(sql);
    const queryType = this._determineQueryType(sql);
    const estimatedRows = this._estimateRows(sql, queryType);
    const warnings = this._generateWarnings(sql, queryType);

    return {
      tables_involved: tables,
      query_type: queryType,
      estimated_rows: estimatedRows,
      warnings: warnings,
      risk_level: this._assessRisk(queryType, warnings)
    };
  }

  _extractTables(sql) {
    const tables = [];
    const patterns = [
      /FROM\s+(\w+)/gi,
      /JOIN\s+(\w+)/gi,
      /UPDATE\s+(\w+)/gi,
      /INSERT\s+INTO\s+(\w+)/gi,
      /DELETE\s+FROM\s+(\w+)/gi
    ];

    for (const rx of patterns) {
      const matches = [...sql.matchAll(rx)];
      matches.forEach(m => tables.push(m[1]));
    }

    return [...new Set(tables)];
  }

  _determineQueryType(sql) {
    const sqlUpper = sql.toUpperCase().trim();
    if (sqlUpper.startsWith('SELECT')) return 'SELECT';
    if (sqlUpper.startsWith('INSERT')) return 'INSERT';
    if (sqlUpper.startsWith('UPDATE')) return 'UPDATE';
    if (sqlUpper.startsWith('DELETE')) return 'DELETE';
    if (sqlUpper.startsWith('DROP')) return 'DROP';
    if (sqlUpper.startsWith('TRUNCATE')) return 'TRUNCATE';
    return 'UNKNOWN';
  }

  _estimateRows(sql, queryType) {
    const sqlUpper = sql.toUpperCase();

    if (queryType === 'SELECT') {
      // Check for LIMIT clause
      const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
      if (limitMatch) return parseInt(limitMatch[1], 10);

      // Check for TOP clause
      const topMatch = sql.match(/TOP\s+(\d+)/i);
      if (topMatch) return parseInt(topMatch[1], 10);

      // Check if primary key equality matches (returns 1 row)
      if (sqlUpper.includes('WHERE')) {
        const conditions = this._extractConditions(sql);
        for (const cond of conditions) {
          if (cond.includes('=') && !/[><]/.test(cond) && !/LIKE/i.test(cond)) {
            const left = cond.split('=')[0].trim().toLowerCase();
            if (left === 'id' || left.endsWith('_id') || left.endsWith('code') || left === 'pk') {
              return 1;
            }
          }
        }
        return 15; // default filtered rows
      }
      return 100; // full scan default estimate
    }

    if (queryType === 'UPDATE' || queryType === 'DELETE') {
      if (sqlUpper.includes('WHERE')) {
        const conditions = this._extractConditions(sql);
        for (const cond of conditions) {
          if (cond.includes('=') && !/[><]/.test(cond)) {
            const left = cond.split('=')[0].trim().toLowerCase();
            if (left === 'id' || left.endsWith('_id') || left === 'pk') {
              return 1; // single PK updates/deletes
            }
          }
        }
        return 12; // average affected rows
      }
      return null; // danger - all rows
    }

    if (queryType === 'INSERT') {
      const matches = [...sql.matchAll(/VALUES\s*\(([^)]+)\)/gi)];
      return matches.length || 1;
    }

    return null;
  }

  _generateWarnings(sql, queryType) {
    const warnings = [];
    const sqlUpper = sql.toUpperCase();

    if ((queryType === 'UPDATE' || queryType === 'DELETE') && !sqlUpper.includes('WHERE')) {
      warnings.push('⚠️ HIGH RISK: No WHERE clause specified. This will affect ALL rows in the table!');
    }

    if (sqlUpper.includes('SELECT *')) {
      warnings.push('ℹ️ Heuristic: Using SELECT * may return unnecessary columns. Consider specifying only needed columns.');
    }

    if (queryType === 'SELECT' && !sqlUpper.includes('WHERE') && !sqlUpper.includes('LIMIT')) {
      warnings.push('ℹ️ Performance: No LIMIT clause specified on table scan. This may return a large number of rows.');
    }

    if (sqlUpper.includes('DROP') || sqlUpper.includes('TRUNCATE')) {
      warnings.push('⚠️ CRITICAL: This query contains DROP or TRUNCATE operations which permanently delete tables/data.');
    }

    // Subquery count
    const selectCount = (sqlUpper.match(/\bSELECT\b/g) || []).length;
    if (selectCount > 1) {
      warnings.push('ℹ️ Complexity: Query contains subqueries which may impact execution performance.');
    }

    // Join counts
    const joinCount = (sqlUpper.match(/\bJOIN\b/g) || []).length;
    if (joinCount > 3) {
      warnings.push(`ℹ️ Complexity: Query contains ${joinCount} JOINs which may slow down execution.`);
    }

    // Cartesian product (cross joins)
    if (sqlUpper.includes('JOIN') && !sqlUpper.includes(' ON ') && !sqlUpper.includes(' USING ') && !sqlUpper.includes('CROSS JOIN')) {
      warnings.push('⚠️ DANGER: JOIN operation is missing an ON or USING clause. This will perform a Cartesian Product (Cross Join), creating a massive performance bottleneck!');
    }

    return warnings;
  }

  _assessRisk(queryType, warnings) {
    if (warnings.some(w => w.includes('CRITICAL') || w.includes('ALL rows'))) {
      return 'HIGH';
    }
    if (queryType === 'DELETE' || queryType === 'UPDATE') {
      return 'MEDIUM';
    }
    if (warnings.some(w => w.includes('DANGER') || w.includes('bottleneck'))) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  _extractConditions(sql) {
    const rx = /WHERE\s+([\s\S]*?)(?:GROUP BY|ORDER BY|LIMIT|;|$)/i;
    const match = sql.match(rx);
    if (match) {
      const clauses = match[1].trim();
      return clauses
        .split(/\s+AND\s+|\s+OR\s+/i)
        .map(c => c.trim())
        .filter(Boolean);
    }
    return [];
  }
}

module.exports = new QueryAnalyzer();
