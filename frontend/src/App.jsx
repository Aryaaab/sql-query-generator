import { useState, useEffect, useCallback } from 'react';
import './App.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';
const TABLE_LIMIT = 100;

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ic = {
  Table:    () => <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M6 3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6a3 3 0 013-3z"/></svg>,
  Database: () => <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/></svg>,
  Key:      () => <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m-3.436-3.436L4 16.586V20h3.414l9.02-9.02a2.828 2.828 0 11-4-4z"/></svg>,
  Plus:     () => <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>,
  Trash:    () => <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
  Play:     () => <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg>,
  Stars:    () => <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>,
  Terminal: () => <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
  Settings: () => <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  History:  () => <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Copy:     () => <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>,
  Refresh:  () => <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>,
  Link:     () => <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>,
  Upload:   () => <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>,
};

const PRESETS = {
  hr_company:  ['Show all employees in IT department', 'List departments in London', 'Give all employees in IT a 10% salary raise'],
  university:  ['Find top 3 Computer Science students by CGPA', 'Show all courses with 4 credits', 'Add a new CS course CS301'],
  ecommerce:   ['Show total amount spent by Bruce Wayne', 'List electronics products with stock under 30', 'Find all orders from USA customers'],
  general:     ['Show all records', 'Find items sorted by price descending', 'Count all rows in the table'],
};

// ─── Spinner ──────────────────────────────────────────────────────────────────
const Spinner = ({ size = 'sm' }) => <div className={`spinner spinner-${size}`} />;

// ─── Results Panel ────────────────────────────────────────────────────────────
function ResultsPanel({ result, onClose }) {
  if (!result) return null;
  return (
    <div className={`results-panel ${result.success ? 'rp-success' : 'rp-error'}`}>
      <div className="rp-header">
        <div className="rp-status-row">
          <span className={`rp-badge ${result.success ? 'badge-green' : 'badge-red'}`}>
            {result.success ? '✓ SUCCESS' : '✗ ERROR'}
          </span>
          {result.success && result.rows_affected !== undefined && (
            <span className="rp-meta">{result.rows_affected} row(s)</span>
          )}
          {result.success && result.execution_time_ms !== undefined && (
            <span className="rp-meta">{result.execution_time_ms.toFixed(2)} ms</span>
          )}
        </div>
        {onClose && <button className="rp-close" onClick={onClose}>✕</button>}
      </div>

      {!result.success && (
        <div className="rp-error-box">
          <code>{result.message}</code>
        </div>
      )}

      {result.success && result.columns?.length > 0 && (
        <div className="rp-table-wrap">
          <table className="rp-table">
            <thead><tr>{result.columns.map(c => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>
              {result.rows?.length > 0
                ? result.rows.map((row, i) => (
                    <tr key={i}>
                      {result.columns.map(c => (
                        <td key={c}>{row[c] === null ? <em className="null-val">NULL</em> : String(row[c])}</td>
                      ))}
                    </tr>
                  ))
                : <tr><td colSpan={result.columns.length} className="rp-empty">0 rows returned</td></tr>
              }
            </tbody>
          </table>
        </div>
      )}

      {result.success && (!result.columns || result.columns.length === 0) && (
        <div className="rp-write-ok">
          <div className="rp-check">✓</div>
          <div>
            <strong>Query executed successfully</strong>
            <p>{result.rows_affected || 0} row(s) affected</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {

  // Core
  const [activeTab,        setActiveTab]        = useState('browser');
  const [activeSchemaKey,  setActiveSchemaKey]  = useState('hr_company');
  const [activeSchemaName, setActiveSchemaName] = useState('HR & Company Database');
  const [schema,           setSchema]           = useState({ tables: [] });
  const [dbConnecting,     setDbConnecting]     = useState(false);
  const [serverOffline,    setServerOffline]    = useState(false);

  // Table browser
  const [selectedTable,  setSelectedTable]  = useState(null);
  const [tableData,      setTableData]      = useState(null);
  const [tableLoading,   setTableLoading]   = useState(false);
  const [tablePage,      setTablePage]      = useState(1);
  const [showInsert,     setShowInsert]     = useState(false);
  const [insertVals,     setInsertVals]     = useState({});
  const [deletingPk,     setDeletingPk]     = useState(null);
  const [expandedTables, setExpandedTables] = useState({});

  // SQL editor
  const [sqlText,    setSqlText]    = useState('SELECT * FROM employees;');
  const [sqlResult,  setSqlResult]  = useState(null);
  const [sqlRunning, setSqlRunning] = useState(false);

  // AI generator
  const [prompt,           setPrompt]           = useState('');
  const [provider,         setProvider]         = useState('rules');
  const [generatedQueries, setGeneratedQueries] = useState([]);
  const [selectedQIdx,     setSelectedQIdx]     = useState(0);
  const [isGenerating,     setIsGenerating]     = useState(false);
  const [aiResult,         setAiResult]         = useState(null);
  const [aiRunning,        setAiRunning]        = useState(false);
  const [openaiOk,         setOpenaiOk]         = useState(false);
  const [geminiOk,         setGeminiOk]         = useState(false);

  // Resume extraction
  const [resumeFile,       setResumeFile]       = useState(null);
  const [resumeResult,     setResumeResult]     = useState(null);
  const [resumeUploading,  setResumeUploading]  = useState(false);

  // History
  const [history,      setHistory]      = useState([]);
  const [showHistory,  setShowHistory]  = useState(false);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [openaiKey,    setOpenaiKey]    = useState('');
  const [geminiKey,    setGeminiKey]    = useState('');

  // Toast
  const [toast, setToast] = useState(null);

  // ── helpers ──────────────────────────────────────────────────────────────────
  const notify = useCallback((type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const activeTableSchema = schema.tables.find(t => t.name === selectedTable);
  const pkColumn = activeTableSchema?.columns.find(c => c.primary_key)?.name
                || activeTableSchema?.columns[0]?.name;
  const totalPages = tableData ? Math.ceil(tableData.total / TABLE_LIMIT) : 1;
  const presets    = PRESETS[activeSchemaKey] || PRESETS.general;
  const activeQuery = generatedQueries[selectedQIdx];

  // ── API: status ───────────────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/status`);
      if (!res.ok) throw new Error();
      const d = await res.json();
      setOpenaiOk(d.openai_configured);
      setGeminiOk(d.gemini_configured);
      if      (d.gemini_configured) setProvider('gemini');
      else if (d.openai_configured) setProvider('openai');
      else setProvider('rules');
      setServerOffline(false);
    } catch { setServerOffline(true); }
  }, []);

  // ── API: connect DB ───────────────────────────────────────────────────────────
  const connectDatabase = useCallback(async (key) => {
    setDbConnecting(true);
    setSelectedTable(null);
    setTableData(null);
    setSqlResult(null);
    setAiResult(null);
    setGeneratedQueries([]);
    try {
      const res  = await fetch(`${API_BASE}/db/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'mock', database: key }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setActiveSchemaName(data.schema_name);
      setActiveSchemaKey(key);
      const sch = data.schema || { tables: [] };
      setSchema(sch);
      if (sch.tables?.length > 0) setSelectedTable(sch.tables[0].name);
    } catch (err) { notify('error', 'Connection failed: ' + err.message); }
    finally        { setDbConnecting(false); }
  }, [notify]);

  // ── API: load table rows ──────────────────────────────────────────────────────
  const loadTable = useCallback(async (tbl, page = 1) => {
    if (!tbl) return;
    setTableLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/db/table/${tbl}?page=${page}&limit=${TABLE_LIMIT}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setTableData(data);
      setTablePage(page);
    } catch (err) { notify('error', 'Failed to load: ' + err.message); }
    finally       { setTableLoading(false); }
  }, [notify]);

  // ── API: insert row ───────────────────────────────────────────────────────────
  const handleInsert = async (e) => {
    e.preventDefault();
    const row = Object.fromEntries(Object.entries(insertVals).filter(([, v]) => v !== ''));
    if (!Object.keys(row).length) { notify('error', 'Fill in at least one field.'); return; }
    try {
      const res  = await fetch(`${API_BASE}/db/table/${selectedTable}/insert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      notify('success', 'Row inserted!');
      setShowInsert(false);
      setInsertVals({});
      loadTable(selectedTable, tablePage);
    } catch (err) { notify('error', 'Insert failed: ' + err.message); }
  };

  // ── API: delete row ───────────────────────────────────────────────────────────
  const handleDelete = async (row) => {
    if (!window.confirm('Delete this row? This cannot be undone.')) return;
    const pkVal = row[pkColumn];
    setDeletingPk(pkVal);
    try {
      const res  = await fetch(`${API_BASE}/db/table/${selectedTable}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pk_column: pkColumn, pk_value: pkVal }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      notify('success', 'Row deleted.');
      loadTable(selectedTable, tablePage);
    } catch (err) { notify('error', 'Delete failed: ' + err.message); }
    finally       { setDeletingPk(null); }
  };

  // ── API: run SQL ──────────────────────────────────────────────────────────────
  const runSQL = async (sql, resultSetter, runningSetter) => {
    if (!sql?.trim()) return;
    runningSetter(true);
    resultSetter(null);
    try {
      const res  = await fetch(`${API_BASE}/db/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, prompt: 'Direct execution' }),
      });
      const data = await res.json();
      resultSetter(data);
      fetchHistory();
      if (data.success) notify('success', `Done — ${data.rows_affected} row(s)`);
      else notify('error', data.message);
    } catch (err) {
      resultSetter({ success: false, message: err.message });
      notify('error', err.message);
    } finally { runningSetter(false); }
  };

  // ── API: generate SQL ─────────────────────────────────────────────────────────
  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setGeneratedQueries([]);
    setAiResult(null);
    try {
      const res  = await fetch(`${API_BASE}/generate-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ natural_language: prompt, provider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      if (data.queries?.length) { setGeneratedQueries(data.queries); setSelectedQIdx(0); }
      else throw new Error('No queries generated.');
    } catch (err) { notify('error', err.message); }
    finally       { setIsGenerating(false); }
  };

  // ── API: history ──────────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/history`);
      if (res.ok) setHistory(await res.json());
    } catch {}
  }, []);

  const clearHistory = async () => {
    await fetch(`${API_BASE}/history/clear`, { method: 'POST' });
    setHistory([]);
  };

  // ── API: save settings ────────────────────────────────────────────────────────
  const saveSettings = async (e) => {
    e.preventDefault();
    try {
      const res  = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openai_api_key: openaiKey, gemini_api_key: geminiKey }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setOpenaiOk(data.openai_configured);
      setGeminiOk(data.gemini_configured);
      if (data.gemini_configured && geminiKey) setProvider('gemini');
      else if (data.openai_configured && openaiKey) setProvider('openai');
      setOpenaiKey(''); setGeminiKey('');
      setShowSettings(false);
      notify('success', 'API keys saved!');
    } catch (err) { notify('error', err.message); }
  };

  // ── API: resume extraction ───────────────────────────────────────────────
  const handleResumeUpload = async (e) => {
    e.preventDefault();
    if (!resumeFile) {
      notify('error', 'Choose a resume file first.');
      return;
    }

    const formData = new FormData();
    formData.append('resume', resumeFile);
    setResumeUploading(true);
    setResumeResult(null);

    try {
      const res = await fetch(`${API_BASE}/resume/extract`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Resume extraction failed.');
      setResumeResult(data);
      notify('success', `Extracted ${data.token_count} tokens.`);
    } catch (err) {
      setResumeResult({ success: false, message: err.message });
      notify('error', err.message);
    } finally {
      setResumeUploading(false);
    }
  };

  // ── Effects ───────────────────────────────────────────────────────────────────
  useEffect(() => { fetchStatus(); fetchHistory(); connectDatabase('hr_company'); }, []);

  useEffect(() => {
    if (selectedTable) {
      loadTable(selectedTable, 1);
      setShowInsert(false);
      setInsertVals({});
    }
  }, [selectedTable]);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="shell">

      {/* ── Toast ── */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <header className="hdr">
        <div className="hdr-brand">
          <span className="hdr-logo">🪄</span>
          <div>
            <div className="hdr-title">SQL Alchemy</div>
            <div className="hdr-sub">Database Management Studio</div>
          </div>
        </div>

        <div className="hdr-status">
          <span className={`conn-dot ${serverOffline ? 'dot-red' : 'dot-green'}`} />
          {serverOffline
            ? <span className="hdr-offline">Backend Offline</span>
            : <span className="hdr-db-name">{activeSchemaName}</span>
          }
        </div>

        <div className="hdr-actions">
          <button className="hdr-btn" onClick={() => setShowHistory(s => !s)} title="Query History">
            <Ic.History />
            {history.length > 0 && <span className="hdr-badge">{history.length}</span>}
          </button>
          <button className="hdr-btn" onClick={() => setShowSettings(true)} title="Settings">
            <Ic.Settings />
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="body-layout">

        {/* ── Sidebar ── */}
        <aside className="sidebar">
          {/* DB picker */}
          <div className="sb-section">
            <div className="sb-label"><Ic.Database /><span>Database</span></div>
            <select
              className="sb-select"
              value={activeSchemaKey}
              onChange={e => connectDatabase(e.target.value)}
              disabled={dbConnecting}
            >
              <option value="hr_company">HR &amp; Company</option>
              <option value="university">University Registrar</option>
              <option value="ecommerce">E-Commerce Shop</option>
            </select>
          </div>

          {/* Tables tree */}
          <div className="sb-section sb-grow">
            <div className="sb-label">
              <Ic.Table />
              <span>Tables {schema.tables.length > 0 && `(${schema.tables.length})`}</span>
            </div>

            {dbConnecting ? (
              <div className="sb-loading"><Spinner /><span>Connecting…</span></div>
            ) : (
              <div className="tree">
                {schema.tables.map(tbl => {
                  const isActive   = selectedTable === tbl.name;
                  const isExpanded = expandedTables[tbl.name] || isActive;
                  return (
                    <div key={tbl.name} className="tree-node">
                      <button
                        className={`tree-tbl ${isActive ? 'tree-tbl-active' : ''}`}
                        onClick={() => {
                          setSelectedTable(tbl.name);
                          setActiveTab('browser');
                          setExpandedTables(p => ({ ...p, [tbl.name]: !p[tbl.name] }));
                        }}
                      >
                        <span className="tree-tbl-icon">📋</span>
                        <span className="tree-tbl-name">{tbl.name}</span>
                        <span className="tree-tbl-count">{tbl.columns.length}</span>
                      </button>

                      {isExpanded && (
                        <div className="tree-cols">
                          {tbl.columns.map(col => (
                            <div key={col.name} className="tree-col">
                              <span className="tree-col-icon">
                                {col.primary_key
                                  ? <span className="col-pk-icon" title="Primary Key"><Ic.Key /></span>
                                  : tbl.foreign_keys?.some(f => f.column === col.name)
                                    ? <span className="col-fk-icon" title="Foreign Key"><Ic.Link /></span>
                                    : <span className="col-plain-dot" />
                                }
                              </span>
                              <span className="tree-col-name">{col.name}</span>
                              <span className="tree-col-type">{col.type?.toLowerCase()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* ── Workspace ── */}
        <div className="workspace">

          {/* Tab bar */}
          <div className="tabbar">
            {[
              { key: 'browser',  label: 'Table Browser', Icon: Ic.Table    },
              { key: 'editor',   label: 'SQL Editor',    Icon: Ic.Terminal },
              { key: 'ai',       label: 'AI Generator',  Icon: Ic.Stars    },
              { key: 'resume',   label: 'Resume Upload', Icon: Ic.Upload   },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                className={`tab ${activeTab === key ? 'tab-active' : ''}`}
                onClick={() => setActiveTab(key)}
              >
                <Icon />{label}
              </button>
            ))}
          </div>

          {/* ── Tab: Table Browser ── */}
          {activeTab === 'browser' && (
            <div className="tab-pane">
              {!selectedTable ? (
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <h3>Select a table</h3>
                  <p>Click any table in the sidebar to browse its data</p>
                </div>
              ) : (
                <>
                  {/* Toolbar */}
                  <div className="tb-toolbar">
                    <div className="tb-title">
                      <Ic.Table />
                      <strong>{selectedTable}</strong>
                      {tableData && <span className="tb-count">{tableData.total.toLocaleString()} rows</span>}
                    </div>
                    <div className="tb-actions">
                      <button
                        className={`btn btn-primary btn-sm ${showInsert ? 'btn-active' : ''}`}
                        onClick={() => { setShowInsert(s => !s); setInsertVals({}); }}
                      >
                        <Ic.Plus /> Add Row
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => loadTable(selectedTable, tablePage)}
                        disabled={tableLoading}
                      >
                        <Ic.Refresh /> Refresh
                      </button>
                    </div>
                  </div>

                  {/* Insert form */}
                  {showInsert && activeTableSchema && (
                    <form className="insert-form" onSubmit={handleInsert}>
                      <div className="insert-form-hdr">
                        <span>✚ New Row — <em>{selectedTable}</em></span>
                        <button type="button" className="ghost-x" onClick={() => setShowInsert(false)}>✕</button>
                      </div>
                      <div className="insert-fields">
                        {activeTableSchema.columns
                          .filter(c => !c.primary_key)
                          .map(col => (
                            <div key={col.name} className="insert-field">
                              <label className="insert-lbl">
                                {col.name}
                                <span className="insert-type">{col.type?.toLowerCase()}</span>
                                {col.nullable === false && <span className="insert-req">*</span>}
                              </label>
                              <input
                                type="text"
                                className="insert-inp"
                                placeholder={col.nullable !== false ? 'optional' : 'required'}
                                value={insertVals[col.name] || ''}
                                onChange={e => setInsertVals(p => ({ ...p, [col.name]: e.target.value }))}
                              />
                            </div>
                          ))}
                      </div>
                      <div className="insert-footer">
                        <button type="submit" className="btn btn-success btn-sm">Insert Row</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowInsert(false)}>Cancel</button>
                      </div>
                    </form>
                  )}

                  {/* Data grid */}
                  {tableLoading ? (
                    <div className="grid-loading"><Spinner size="lg" /><span>Loading…</span></div>
                  ) : tableData?.columns?.length > 0 ? (
                    <div className="grid-wrap">
                      <table className="data-grid">
                        <thead>
                          <tr>
                            <th className="col-num">#</th>
                            {tableData.columns.map(c => (
                              <th key={c}>
                                {activeTableSchema?.columns.find(x => x.name === c)?.primary_key && (
                                  <span className="th-pk" title="Primary Key"><Ic.Key /></span>
                                )}
                                {c}
                              </th>
                            ))}
                            <th className="col-act"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.rows.map((row, ri) => (
                            <tr key={ri} className={deletingPk === row[pkColumn] ? 'row-deleting' : ''}>
                              <td className="col-num">{(tablePage - 1) * TABLE_LIMIT + ri + 1}</td>
                              {tableData.columns.map(c => (
                                <td key={c} title={row[c] !== null && row[c] !== undefined ? String(row[c]) : 'NULL'}>
                                  {row[c] === null || row[c] === undefined
                                    ? <em className="null-val">NULL</em>
                                    : String(row[c])}
                                </td>
                              ))}
                              <td className="col-act">
                                <button
                                  className="delete-btn"
                                  onClick={() => handleDelete(row)}
                                  title="Delete row"
                                  disabled={deletingPk === row[pkColumn]}
                                >
                                  {deletingPk === row[pkColumn] ? <Spinner /> : <Ic.Trash />}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-state small">
                      <p>No rows in this table yet.</p>
                    </div>
                  )}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="pagination">
                      <button className="btn btn-ghost btn-xs" disabled={tablePage === 1}
                        onClick={() => loadTable(selectedTable, tablePage - 1)}>← Prev</button>
                      <span className="pg-info">Page {tablePage} / {totalPages}</span>
                      <button className="btn btn-ghost btn-xs" disabled={tablePage >= totalPages}
                        onClick={() => loadTable(selectedTable, tablePage + 1)}>Next →</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Tab: SQL Editor ── */}
          {activeTab === 'editor' && (
            <div className="tab-pane editor-pane">
              <div className="editor-bar">
                <span className="editor-bar-title"><Ic.Terminal /> SQL Editor</span>
                <div className="editor-bar-actions">
                  <span className="editor-hint">Ctrl+Enter to run</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setSqlText(''); setSqlResult(null); }}>Clear</button>
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => runSQL(sqlText, setSqlResult, setSqlRunning)}
                    disabled={sqlRunning || !sqlText.trim()}
                  >
                    {sqlRunning ? <Spinner /> : <Ic.Play />} Run Query
                  </button>
                </div>
              </div>

              <textarea
                className="sql-editor"
                value={sqlText}
                onChange={e => setSqlText(e.target.value)}
                placeholder={'Write your SQL here...\n\nExample:\nSELECT * FROM employees WHERE salary > 60000 ORDER BY salary DESC;'}
                spellCheck={false}
                onKeyDown={e => {
                  if (e.ctrlKey && e.key === 'Enter') { runSQL(sqlText, setSqlResult, setSqlRunning); }
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    const s = e.target.selectionStart;
                    const v = sqlText.substring(0, s) + '  ' + sqlText.substring(e.target.selectionEnd);
                    setSqlText(v);
                    setTimeout(() => e.target.setSelectionRange(s + 2, s + 2), 0);
                  }
                }}
              />

              {/* Quick table buttons */}
              {schema.tables.length > 0 && (
                <div className="quick-row">
                  <span className="quick-label">Quick:</span>
                  {schema.tables.map(t => (
                    <button key={t.name} className="quick-chip"
                      onClick={() => setSqlText(`SELECT * FROM ${t.name};`)}>
                      {t.name}
                    </button>
                  ))}
                </div>
              )}

              <ResultsPanel
                result={sqlResult}
                onClose={() => setSqlResult(null)}
              />
            </div>
          )}

          {/* ── Tab: AI Generator ── */}
          {activeTab === 'ai' && (
            <div className="tab-pane ai-pane">
              <div className="ai-hero">
                <Ic.Stars />
                <div>
                  <h2 className="ai-title">AI SQL Generator</h2>
                  <p className="ai-sub">Describe what you want in plain English — get SQL instantly</p>
                </div>
              </div>

              <form className="ai-form" onSubmit={handleGenerate}>
                <textarea
                  className="ai-area"
                  rows={3}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="e.g. Show all employees in the IT department with salary above 60000"
                />
                <div className="ai-controls">
                  <div className="provider-row">
                    <span className="provider-lbl">AI Engine:</span>
                    {[
                      { k: 'gemini', label: 'Gemini ✨', on: geminiOk },
                      { k: 'openai', label: 'OpenAI ⚡', on: openaiOk },
                      { k: 'rules',  label: 'Offline',  on: true     },
                    ].map(p => (
                      <button key={p.k} type="button"
                        className={`provider-chip ${provider === p.k ? 'prov-active' : ''} ${!p.on ? 'prov-off' : ''}`}
                        onClick={() => p.on && setProvider(p.k)}
                      >{p.label}{!p.on && ' (off)'}</button>
                    ))}
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={isGenerating || !prompt.trim()}>
                    {isGenerating ? <><Spinner /> Generating…</> : <><Ic.Stars /> Generate SQL</>}
                  </button>
                </div>
              </form>

              {/* Preset suggestions */}
              <div className="presets-row">
                <span className="presets-lbl">Try asking:</span>
                <div className="preset-chips">
                  {presets.map((p, i) => (
                    <button key={i} className="preset-chip" onClick={() => setPrompt(p)}>{p}</button>
                  ))}
                </div>
              </div>

              {/* Generated queries */}
              {generatedQueries.length > 0 && (
                <div className="gen-queries">
                  {generatedQueries.length > 1 && (
                    <div className="query-tabs">
                      {generatedQueries.map((q, i) => (
                        <button key={i}
                          className={`q-tab ${selectedQIdx === i ? 'q-tab-active' : ''}`}
                          onClick={() => { setSelectedQIdx(i); setAiResult(null); }}
                        >
                          Option {i + 1}
                          <span className={`conf-tag conf-${q.confidence}`}>{q.confidence}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {activeQuery && (
                    <div className="query-card">
                      {/* SQL block */}
                      <div className="sql-blk">
                        <div className="sql-blk-hdr">
                          <span className="sql-type">{activeQuery.query_type}</span>
                          <div className="sql-blk-acts">
                            <button className="ghost-act" onClick={() => navigator.clipboard.writeText(activeQuery.sql)}>
                              <Ic.Copy /> Copy
                            </button>
                            <button
                              className="btn btn-success btn-sm"
                              disabled={aiRunning}
                              onClick={() => runSQL(activeQuery.sql, setAiResult, setAiRunning)}
                            >
                              {aiRunning ? <Spinner /> : <Ic.Play />} Run
                            </button>
                          </div>
                        </div>
                        <pre className="sql-pre">{activeQuery.sql}</pre>
                      </div>

                      {/* Stats row */}
                      <div className="query-stats">
                        <span className="stat-pill">
                          Risk: <strong className={`risk-${activeQuery.analysis?.risk_level || 'LOW'}`}>
                            {activeQuery.analysis?.risk_level || 'LOW'}
                          </strong>
                        </span>
                        <span className="stat-pill">
                          Valid: <strong className={activeQuery.validation?.is_valid ? 'c-green' : 'c-red'}>
                            {activeQuery.validation?.is_valid ? 'Yes ✓' : 'No ✗'}
                          </strong>
                        </span>
                        <span className="stat-pill">
                          Confidence: <strong>{activeQuery.confidence}</strong>
                        </span>
                      </div>

                      {/* Explanation */}
                      {activeQuery.explanation && (
                        <div className="expl-box">
                          <div className="expl-title">Explanation</div>
                          <div className="expl-body">
                            {activeQuery.explanation.split('\n').filter(Boolean).map((ln, i) => (
                              <p key={i} className="expl-line">{ln}</p>
                            ))}
                          </div>
                        </div>
                      )}

                      <ResultsPanel result={aiResult} onClose={() => setAiResult(null)} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Resume Upload ── */}
          {activeTab === 'resume' && (
            <div className="tab-pane resume-pane">
              <div className="resume-hero">
                <Ic.Upload />
                <div>
                  <h2 className="resume-title">Resume Upload</h2>
                  <p className="resume-sub">Extract readable text and tokens from PDF, DOCX, or TXT resumes.</p>
                </div>
              </div>

              <form className="resume-form" onSubmit={handleResumeUpload}>
                <label className="resume-drop">
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={e => {
                      setResumeFile(e.target.files?.[0] || null);
                      setResumeResult(null);
                    }}
                  />
                  <span className="resume-file-name">
                    {resumeFile ? resumeFile.name : 'Choose resume file'}
                  </span>
                  <span className="resume-file-meta">PDF, DOCX, or TXT up to 8 MB</span>
                </label>
                <button type="submit" className="btn btn-primary" disabled={resumeUploading || !resumeFile}>
                  {resumeUploading ? <><Spinner /> Extracting...</> : <><Ic.Upload /> Extract Resume</>}
                </button>
              </form>

              {resumeResult && !resumeResult.success && (
                <div className="resume-error">
                  <strong>Extraction failed</strong>
                  <p>{resumeResult.message}</p>
                </div>
              )}

              {resumeResult?.success && (
                <div className="resume-results">
                  <div className="resume-stats">
                    <span className="stat-pill">File: <strong>{resumeResult.file_name}</strong></span>
                    <span className="stat-pill">Type: <strong>{resumeResult.file_type}</strong></span>
                    <span className="stat-pill">Tokens: <strong>{resumeResult.token_count}</strong></span>
                  </div>

                  <div className="resume-grid">
                    <section className="resume-panel">
                      <div className="resume-panel-title">Extracted Text</div>
                      <pre className="resume-text">{resumeResult.text}</pre>
                    </section>

                    <section className="resume-panel">
                      <div className="resume-panel-title">Token Preview</div>
                      <div className="token-list">
                        {resumeResult.tokens.map((token, i) => (
                          <span className="token-chip" key={`${token}-${i}`}>{token}</span>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── History Drawer ── */}
        {showHistory && (
          <aside className="hist-drawer">
            <div className="hist-hdr">
              <h3>History</h3>
              <div className="hist-hdr-acts">
                {history.length > 0 && (
                  <button className="ghost-act c-red" onClick={clearHistory}>Clear all</button>
                )}
                <button className="ghost-act" onClick={() => setShowHistory(false)}>✕</button>
              </div>
            </div>
            <div className="hist-list">
              {history.length === 0
                ? <p className="hist-empty">No history yet.</p>
                : history.map((item, i) => (
                    <div key={i}
                      className={`hist-card ${item.status?.toLowerCase() === 'success' ? 'hc-ok' : 'hc-err'}`}
                      title="Click to load into SQL Editor"
                      onClick={() => { setSqlText(item.sqlQuery); setActiveTab('editor'); setShowHistory(false); }}
                    >
                      <div className="hc-top">
                        <span className={`hc-dot ${item.status?.toLowerCase()}`} />
                        <span className="hc-schema">{item.schemaName}</span>
                        <span className="hc-time">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {item.prompt && <p className="hc-prompt">{item.prompt}</p>}
                      <code className="hc-sql">{item.sqlQuery}</code>
                      <div className="hc-foot">
                        <span className={`hc-badge ${item.status?.toLowerCase()}`}>{item.status}</span>
                        <span className="hc-meta">{item.rowsAffected} rows • {item.executionTimeMs?.toFixed(1)}ms</span>
                      </div>
                    </div>
                  ))
              }
            </div>
          </aside>
        )}
      </div>

      {/* ── Settings Modal ── */}
      {showSettings && (
        <div className="modal-bg" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h2>⚙️ API Keys</h2>
              <button className="modal-close" onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <form className="modal-body" onSubmit={saveSettings}>
              {[
                { label: 'Gemini API Key', ph: 'AIza…', val: geminiKey, set: setGeminiKey, ok: geminiOk },
                { label: 'OpenAI API Key', ph: 'sk-…',  val: openaiKey, set: setOpenaiKey, ok: openaiOk },
              ].map(f => (
                <div key={f.label} className="modal-field">
                  <label>
                    {f.label}
                    {f.ok && <span className="cfg-badge">✓ Configured</span>}
                  </label>
                  <input type="password" className="modal-inp" placeholder={f.ph}
                    value={f.val} onChange={e => f.set(e.target.value)} />
                </div>
              ))}
              <p className="modal-note">Keys are saved to your local <code>.env</code> file only.</p>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowSettings(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Keys</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
