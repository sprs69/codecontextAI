import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { prApi } from '../services/api';
import { useToast } from '../components/Toast';
import {
  IconPRReview,
  IconAlertTriangle,
  IconCheckCircle,
  IconFileCode,
  IconHistory,
  IconUpload,
  IconPlay,
  IconCode,
  IconCopy,
  IconCheck,
  IconSearch,
  IconX,
  IconChevronRight,
  IconTerminal,
} from '../components/Icons';

function parseDiff(diffText) {
  if (!diffText) return [];
  const lines = diffText.split('\n');
  const files = [];
  let currentFile = null;
  let oldLine = 0;
  let newLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('diff --git')) {
      const match = line.match(/diff --git a\/(.+) b\/(.+)/);
      const filePath = match ? match[2] : line.replace('diff --git ', '');
      currentFile = {
        path: filePath,
        rawHeader: line,
        lines: [],
        added: 0,
        removed: 0,
      };
      files.push(currentFile);
    } else if (!currentFile && (line.startsWith('---') || line.startsWith('+++'))) {
      currentFile = {
        path: line.replace(/^(\+\+\+|---) [ab]\//, '') || 'modified.diff',
        rawHeader: line,
        lines: [],
        added: 0,
        removed: 0,
      };
      files.push(currentFile);
    } else if (currentFile) {
      if (line.startsWith('@@')) {
        const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          oldLine = parseInt(match[1], 10);
          newLine = parseInt(match[2], 10);
        }
        currentFile.lines.push({ type: 'hunk', content: line });
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        currentFile.added++;
        currentFile.lines.push({
          type: 'add',
          oldLine: null,
          newLine: newLine++,
          content: line,
        });
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        currentFile.removed++;
        currentFile.lines.push({
          type: 'del',
          oldLine: oldLine++,
          newLine: null,
          content: line,
        });
      } else if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('index')) {
        currentFile.lines.push({ type: 'meta', content: line });
      } else {
        currentFile.lines.push({
          type: 'context',
          oldLine: oldLine++,
          newLine: newLine++,
          content: line,
        });
      }
    }
  }

  if (files.length === 0 && diffText.trim()) {
    const fallbackLines = lines.map((l, idx) => ({
      type: l.startsWith('+') && !l.startsWith('+++')
        ? 'add'
        : l.startsWith('-') && !l.startsWith('---')
        ? 'del'
        : l.startsWith('@@')
        ? 'hunk'
        : 'context',
      oldLine: idx + 1,
      newLine: idx + 1,
      content: l,
    }));
    files.push({
      path: 'pasted_diff.patch',
      rawHeader: 'Raw Diff',
      lines: fallbackLines,
      added: fallbackLines.filter((l) => l.type === 'add').length,
      removed: fallbackLines.filter((l) => l.type === 'del').length,
    });
  }

  return files;
}

export default function PRReviewPage({ activeRepo, onLoadDemo }) {
  const [diff, setDiff] = useState('');
  const [title, setTitle] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('ide'); // ide | overview | diff | checklist
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [focusedLine, setFocusedLine] = useState(null);
  const [checkedQuestions, setCheckedQuestions] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const fileInputRef = useRef(null);
  const { showToast } = useToast();

  const loadHistory = useCallback(async () => {
    if (!activeRepo?.id) return;
    try {
      const data = await prApi.getHistory(activeRepo.id);
      setHistory(data || []);
    } catch {
      // non-blocking
    }
  }, [activeRepo]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const parsedFiles = useMemo(() => {
    return parseDiff(diff);
  }, [diff]);

  const totalLinesAdded = useMemo(() => {
    return parsedFiles.reduce((acc, f) => acc + f.added, 0);
  }, [parsedFiles]);

  const totalLinesRemoved = useMemo(() => {
    return parsedFiles.reduce((acc, f) => acc + f.removed, 0);
  }, [parsedFiles]);

  async function handleAnalyze(e) {
    if (e) e.preventDefault();
    if (!diff.trim() || !activeRepo?.id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await prApi.analyze({
        repository_id: activeRepo.id,
        pr_title: title || 'Pull Request Review',
        diff_content: diff,
      });
      setAnalysis(result);
      showToast('PR Analysis completed successfully!', 'success');
      loadHistory();
    } catch (e) {
      setError(e.message);
      showToast(e.message || 'PR Analysis failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadDemo() {
    setLoading(true);
    setError(null);
    try {
      const demoData = await prApi.getDemo();
      setDiff(demoData.diff);
      setTitle('feat: Add checkout endpoint with Stripe payment');
      setAnalysis({
        ...demoData.analysis,
        id: 'demo-pr',
        repository_id: activeRepo?.id,
        created_at: new Date().toISOString(),
      });
      setSelectedFileIdx(0);
      showToast('Problematic checkout demo PR loaded!', 'info');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setDiff(content);
        setTitle(file.name.replace(/\.(diff|patch)$/, ''));
        showToast(`Loaded diff: ${file.name}`, 'info');
      }
    };
    reader.readAsText(file);
  };

  const handleSelectHistoryItem = (item) => {
    setAnalysis(item);
    setTitle(item.pr_title || 'Historical PR Analysis');
    if (item.diff_content) {
      setDiff(item.diff_content);
    }
    setShowHistory(false);
    showToast('Loaded PR analysis from history', 'info');
  };

  const toggleQuestionCheck = (idx) => {
    setCheckedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    showToast('Copied to clipboard', 'info', 1800);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const riskColor = (level) => {
    if (level === 'CRITICAL') return '#ffffff';
    if (level === 'HIGH') return '#d4d4d4';
    if (level === 'MEDIUM') return '#a3a3a3';
    return '#737373';
  };

  const handleFocusFinding = (v) => {
    if (v.file) {
      const idx = parsedFiles.findIndex(
        (f) =>
          f.path.toLowerCase().includes(v.file.toLowerCase()) ||
          v.file.toLowerCase().includes(f.path.toLowerCase())
      );
      if (idx !== -1) {
        setSelectedFileIdx(idx);
      }
    }
    if (v.line) {
      setFocusedLine(v.line);
      setActiveTab('ide');
      setTimeout(() => {
        const el =
          document.getElementById(`diff-line-new-${v.line}`) ||
          document.getElementById(`diff-line-old-${v.line}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  if (!activeRepo) {
    return (
      <div className="page-container">
        <div className="empty-state fade-in">
          <div className="empty-icon-wrap">
            <IconPRReview size={36} />
          </div>
          <h3>No Repository Selected</h3>
          <p style={{ maxWidth: 480, margin: '0 auto 20px' }}>
            Load the ShopFlow demo or scan a local directory to test pull requests against architectural guardrails and run automated reviews.
          </p>
          {onLoadDemo && (
            <button className="btn btn-primary btn-md cursor-target" onClick={onLoadDemo}>
              <IconPlay size={16} />
              <span>Load ShopFlow Platform Demo</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentFile = parsedFiles[selectedFileIdx] || parsedFiles[0];

  return (
    <div className="page-container">
      {/* ── Topbar Header ────────────────────────────────────────── */}
      <div className="dashboard-topbar fade-in">
        <div>
          <div className="dashboard-tag-row">
            <span className="project-badge">PR INTELLIGENCE GATEKEEPER</span>
            <span className="branch-badge">target: main</span>
          </div>
          <h2 className="dashboard-repo-title">Predictive Pull Request Intelligence</h2>
          <p className="dashboard-meta-text">
            Automated architectural risk scoring, secret detection, and pre-merge violation auditing for{' '}
            <strong>{activeRepo.analysis_result?.project_name || activeRepo.name}</strong>.
          </p>
        </div>

        <div className="dashboard-header-actions">
          <button
            className="btn btn-secondary btn-sm cursor-target"
            onClick={() => setShowHistory(true)}
            title="View past PR analysis history"
          >
            <IconHistory size={14} />
            <span>PR History ({history.length})</span>
          </button>
          <button
            className="btn btn-primary btn-sm cursor-target"
            onClick={handleLoadDemo}
            disabled={loading}
          >
            <IconPlay size={14} />
            <span>Load Risky Checkout Demo PR</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="card fade-in" style={{ borderColor: 'rgba(255,255,255,0.2)', marginBottom: 20 }}>
          <p style={{ color: 'var(--text-primary)', fontSize: 13 }}>{error}</p>
        </div>
      )}

      {/* ── Input & Diff Configuration Card ─────────────────────── */}
      <div className="card fade-in" style={{ marginBottom: 24, padding: '18px 22px' }}>
        <div className="section-title-row" style={{ marginBottom: 14 }}>
          <div>
            <h3 className="card-title">Pull Request Input & Patch Source</h3>
            <p className="subheading-desc">Paste unified git diff output or upload a .diff / .patch file</p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="file"
              ref={fileInputRef}
              accept=".diff,.patch,.txt"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <button
              className="btn btn-secondary btn-sm cursor-target"
              onClick={() => fileInputRef.current?.click()}
            >
              <IconUpload size={13} />
              <span>Upload Diff</span>
            </button>
            {diff && (
              <button
                className="btn btn-secondary btn-sm cursor-target"
                onClick={() => {
                  setDiff('');
                  setTitle('');
                  setAnalysis(null);
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">PR Title / Description</label>
            <input
              className="input"
              placeholder="e.g. feat: Add checkout endpoint with Stripe payment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-primary cursor-target"
              onClick={handleAnalyze}
              disabled={loading || !diff.trim()}
              style={{ width: '100%', maxWidth: 220 }}
            >
              <IconSearch size={15} />
              <span>{loading ? 'Evaluating PR Risk...' : 'Run Risk Gatekeeper'}</span>
            </button>
          </div>
        </div>

        {/* Textarea for diff input */}
        <div className="form-group" style={{ marginTop: 12, marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <label className="form-label">Unified Diff Content</label>
            {parsedFiles.length > 0 && (
              <span className="micro-tag">
                {parsedFiles.length} {parsedFiles.length === 1 ? 'file' : 'files'} &bull; +{totalLinesAdded} -{totalLinesRemoved} lines
              </span>
            )}
          </div>
          <textarea
            className="textarea diff-input-textarea"
            rows={diff ? 6 : 4}
            placeholder="Paste your unified git diff here (e.g. diff --git a/... b/... or +++ / ---)..."
            value={diff}
            onChange={(e) => setDiff(e.target.value)}
          />
        </div>
      </div>

      {/* ── Active Analysis Dashboard ────────────────────────────── */}
      {analysis && (
        <div className="pr-analysis-results fade-in">
          {/* PR Assessment Banner */}
          <div
            className="card pr-hero-card"
            style={{
              borderColor: riskColor(analysis.risk_level),
              borderLeftWidth: 6,
              marginBottom: 24,
            }}
          >
            <div className="pr-hero-grid">
              {/* Score Gauge */}
              <div className="pr-score-block">
                <div className="pr-score-label">PREDICTIVE RISK SCORE</div>
                <div className="pr-score-value" style={{ color: riskColor(analysis.risk_level) }}>
                  {analysis.risk_score}
                  <span className="pr-score-max">/100</span>
                </div>
                <span
                  className={`badge badge-${analysis.risk_level?.toLowerCase()}`}
                  style={{ fontSize: 12, padding: '3px 12px' }}
                >
                  {analysis.risk_level} RISK
                </span>
              </div>

              {/* Summary Stats */}
              <div className="pr-stats-block">
                <h3 className="pr-hero-title">{analysis.pr_title || title || 'Pull Request Review'}</h3>
                <div className="pr-meta-badges">
                  <span className="pr-gatekeeper-pill blocked">
                    <IconAlertTriangle size={13} />
                    <span>MERGE BLOCKED</span>
                  </span>
                  <span className="micro-tag">
                    {analysis.violations?.length || 0} Rule Violations
                  </span>
                  <span className="micro-tag">
                    +{totalLinesAdded || 28} / -{totalLinesRemoved || 3} lines
                  </span>
                  <span className="micro-tag">
                    {parsedFiles.length || 1} modified {parsedFiles.length === 1 ? 'file' : 'files'}
                  </span>
                </div>

                {/* Changed Architectural Components */}
                {analysis.changed_components?.length > 0 && (
                  <div className="pr-components-row">
                    <span className="pr-components-label">Affected Components:</span>
                    {analysis.changed_components.map((comp, i) => (
                      <span key={i} className="pr-component-chip">
                        <IconCode size={12} />
                        <span>{comp}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="pr-subtabs-row" style={{ marginBottom: 20 }}>
            <button
              className={`pr-subtab-btn cursor-target ${activeTab === 'ide' ? 'active' : ''}`}
              onClick={() => setActiveTab('ide')}
            >
              <span>3-Column Review Workspace</span>
            </button>
            <button
              className={`pr-subtab-btn cursor-target ${activeTab === 'diff' ? 'active' : ''}`}
              onClick={() => setActiveTab('diff')}
            >
              <span>Interactive Diff Viewer</span>
            </button>
            <button
              className={`pr-subtab-btn cursor-target ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <span>Findings & Violations ({analysis.violations?.length || 0})</span>
            </button>
            <button
              className={`pr-subtab-btn cursor-target ${activeTab === 'checklist' ? 'active' : ''}`}
              onClick={() => setActiveTab('checklist')}
            >
              <span>Reviewer Checklist ({analysis.reviewer_questions?.length || 0})</span>
            </button>
          </div>

          {/* ── TAB 0: 3-Column IDE Review Workspace ──────────────────── */}
          {activeTab === 'ide' && (
            <div className="pr-workbench-3col fade-in" style={{ marginBottom: 24 }}>
              {/* LEFT: Changed Files Navigator */}
              <div className="pr-file-nav-panel">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
                  <span className="micro-tag" style={{ letterSpacing: '0.12em' }}>CHANGED FILES</span>
                  <span className="micro-tag">{parsedFiles.length || 1}</span>
                </div>
                <div className="pr-file-list-vertical">
                  {parsedFiles.map((file, idx) => (
                    <button
                      key={idx}
                      className={`pr-file-list-btn cursor-target ${selectedFileIdx === idx ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedFileIdx(idx);
                        setFocusedLine(null);
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                        <IconFileCode size={13} style={{ flexShrink: 0 }} />
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={file.path}>
                          {file.path}
                        </span>
                      </div>
                      <span className="diff-file-counts" style={{ flexShrink: 0 }}>
                        <span className="count-add">+{file.added}</span>
                        <span className="count-del">-{file.removed}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* CENTER: Code / Diff Canvas */}
              <div className="diff-viewer-wrapper" style={{ minWidth: 0 }}>
                <div className="diff-file-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    <IconFileCode size={15} style={{ color: 'var(--text-primary)', flexShrink: 0 }} />
                    <span className="diff-header-filename" style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {currentFile?.path}
                    </span>
                    {focusedLine && (
                      <span className="badge badge-info" style={{ fontSize: 10, marginLeft: 6 }}>
                        Focusing line {focusedLine}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {focusedLine && (
                      <button
                        className="btn btn-secondary btn-sm cursor-target"
                        onClick={() => setFocusedLine(null)}
                        style={{ fontSize: 10, padding: '2px 8px' }}
                      >
                        Clear Highlight
                      </button>
                    )}
                    <button
                      className="btn btn-secondary btn-sm cursor-target"
                      onClick={() => copyToClipboard(diff)}
                      title="Copy diff patch"
                      style={{ fontSize: 11, padding: '3px 8px', flexShrink: 0 }}
                    >
                      {copiedCode === diff ? <IconCheck size={12} /> : <IconCopy size={12} />}
                      <span>{copiedCode === diff ? 'Copied' : 'Copy Patch'}</span>
                    </button>
                  </div>
                </div>

                <div className="diff-code-canvas">
                  {currentFile?.lines?.map((line, idx) => {
                    const isAdd = line.type === 'add';
                    const isDel = line.type === 'del';
                    const isHunk = line.type === 'hunk';
                    const isMeta = line.type === 'meta';
                    const isLineFocused = focusedLine != null && (line.newLine === focusedLine || line.oldLine === focusedLine);

                    return (
                      <div
                        key={idx}
                        id={line.newLine ? `diff-line-new-${line.newLine}` : line.oldLine ? `diff-line-old-${line.oldLine}` : undefined}
                        className={`diff-line-row ${
                          isAdd ? 'line-add' : isDel ? 'line-del' : isHunk ? 'line-hunk' : isMeta ? 'line-meta' : 'line-ctx'
                        } ${isLineFocused ? 'line-focused' : ''}`}
                      >
                        <span className="line-num old-num">{line.oldLine || ''}</span>
                        <span className="line-num new-num">{line.newLine || ''}</span>
                        <span className="line-prefix">{isAdd ? '+' : isDel ? '-' : isHunk ? ' ' : ' '}</span>
                        <span className="line-content">{line.content.replace(/^[+-]/, '')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT: Risk, Findings & Suggested Actions Panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Score Summary Card */}
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span className="micro-tag" style={{ letterSpacing: '0.12em' }}>RISK SCORE</span>
                    <span className={`badge badge-${analysis.risk_level?.toLowerCase()}`}>
                      {analysis.risk_level}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      {analysis.risk_score}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>/100</span>
                  </div>
                  <div className="monochrome-bar" style={{ marginBottom: 10 }}>
                    <div
                      className={`monochrome-bar-fill ${analysis.risk_score >= 70 ? 'critical' : 'warning'}`}
                      style={{ width: `${analysis.risk_score}%` }}
                    />
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    Gatekeeper Status: <strong style={{ color: 'var(--accent-red)' }}>MERGE BLOCKED</strong>
                  </div>
                </div>

                {/* Findings List */}
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span className="micro-tag" style={{ letterSpacing: '0.12em' }}>KEY FINDINGS (CLICK TO FOCUS)</span>
                    <span className="badge badge-high">{analysis.violations?.length || 0}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                    {analysis.violations?.map((v, i) => (
                      <div
                        key={i}
                        className="cursor-target"
                        onClick={() => handleFocusFinding(v)}
                        style={{
                          padding: 10,
                          background: '#FAFAF9',
                          border: '1px solid var(--border-primary)',
                          borderLeft: `3px solid ${
                            v.severity === 'CRITICAL'
                              ? 'var(--accent-red)'
                              : v.severity === 'HIGH'
                              ? 'var(--accent-orange)'
                              : 'var(--border-secondary)'
                          }`,
                          borderRadius: 'var(--radius-xs)',
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)',
                        }}
                        title={v.line ? `Click to focus on line ${v.line} in diff` : undefined}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 3 }}>
                          <span className={`badge badge-${v.severity?.toLowerCase()}`} style={{ fontSize: 9 }}>
                            {v.severity}
                          </span>
                          {(v.file || v.line) && (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                              {v.line ? `line ${v.line}` : ''}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
                          {v.rule}
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4, margin: '0 0 6px 0' }}>
                          {v.description}
                        </p>
                        {v.suggested_fix && (
                          <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '4px 6px', borderRadius: 2 }}>
                            &bull; {v.suggested_fix}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggested Actions */}
                <div className="card" style={{ padding: 16 }}>
                  <span className="micro-tag" style={{ display: 'block', marginBottom: 8, letterSpacing: '0.12em' }}>
                    SUGGESTED ACTIONS
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {analysis.suggested_fixes?.slice(0, 3).map((fix, i) => (
                      <div key={i} style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        &bull; {fix}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 1: Overview & Violations ────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="pr-tab-content fade-in">
              <div className="grid-2" style={{ marginBottom: 24 }}>
                {/* Findings List */}
                <div className="card">
                  <div className="section-title-row" style={{ marginBottom: 14 }}>
                    <h3 className="card-title">Architectural Violations & Hazards</h3>
                    <span className="badge badge-high">
                      {analysis.violations?.filter((v) => v.severity === 'CRITICAL' || v.severity === 'HIGH').length || 0} Blocking
                    </span>
                  </div>

                  <div className="pr-findings-list stagger-group">
                    {analysis.violations?.map((v, i) => (
                      <div
                        key={i}
                        className="pr-finding-card"
                        style={{
                          borderLeft: `3px solid ${
                            v.severity === 'CRITICAL'
                              ? 'var(--accent-red)'
                              : v.severity === 'HIGH'
                              ? 'var(--accent-orange)'
                              : 'var(--border-secondary)'
                          }`,
                        }}
                      >
                        <div className="pr-finding-top" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span className={`badge badge-${v.severity?.toLowerCase()}`}>
                            {v.severity}
                          </span>
                          <span className="pr-finding-rule">{v.rule}</span>
                          {(v.file || v.line) && (
                            <span className="micro-tag">
                              {v.file ? `${v.file}${v.line ? `:${v.line}` : ''}` : `line ${v.line}`}
                            </span>
                          )}
                          {v.line && (
                            <button
                              className="btn btn-secondary btn-sm cursor-target"
                              style={{ fontSize: 10, padding: '2px 8px', marginLeft: 'auto' }}
                              onClick={() => handleFocusFinding(v)}
                            >
                              Focus in Diff
                            </button>
                          )}
                        </div>
                        <p className="pr-finding-desc" style={{ marginBottom: 8 }}>{v.description}</p>
                        {v.explanation && (
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 8 }}>
                            <strong style={{ color: 'var(--text-primary)' }}>Impact:</strong> {v.explanation}
                          </div>
                        )}
                        {v.suggested_fix && (
                          <div className="remediation-box" style={{ marginTop: 6, fontSize: 11 }}>
                            <code>{v.suggested_fix}</code>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggested Fixes */}
                <div className="card">
                  <div className="section-title-row" style={{ marginBottom: 14 }}>
                    <h3 className="card-title">Remediation Blueprint</h3>
                    <span className="micro-tag">Required Actions</span>
                  </div>

                  <div className="pr-fixes-list stagger-group">
                    {analysis.suggested_fixes?.map((fix, i) => (
                      <div key={i} className="pr-fix-card">
                        <div className="pr-fix-header">
                          <IconCheckCircle size={15} style={{ color: 'var(--text-primary)', flexShrink: 0 }} />
                          <span className="pr-fix-title">Remediation Step 0{i + 1}</span>
                        </div>
                        <p className="pr-fix-text">{fix}</p>
                      </div>
                    ))}
                  </div>

                  {/* Tests to add */}
                  {analysis.tests_to_add?.length > 0 && (
                    <div style={{ marginTop: 20 }}>
                      <div className="section-title-row" style={{ marginBottom: 10 }}>
                        <h4 className="card-title" style={{ fontSize: 13 }}>Missing Tests Before Approval</h4>
                        <span className="badge badge-info">{analysis.tests_to_add.length} needed</span>
                      </div>
                      <div className="pr-tests-list">
                        {analysis.tests_to_add.map((test, i) => (
                          <div key={i} className="pr-test-item">
                            <IconTerminal size={13} style={{ color: 'var(--text-muted)' }} />
                            <code>{test}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: Interactive Diff Viewer ──────────────────────── */}
          {activeTab === 'diff' && (
            <div className="pr-tab-content fade-in">
              <div className="diff-viewer-wrapper card" style={{ padding: 0 }}>
                {/* File Navigator Bar */}
                <div className="diff-files-bar">
                  <span className="diff-files-title">Files in Patch:</span>
                  <div className="diff-files-chips">
                    {parsedFiles.map((file, idx) => (
                      <button
                        key={idx}
                        className={`diff-file-chip cursor-target ${selectedFileIdx === idx ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedFileIdx(idx);
                          setFocusedLine(null);
                        }}
                      >
                        <IconFileCode size={13} />
                        <span className="diff-file-name">{file.path}</span>
                        <span className="diff-file-counts">
                          <span className="count-add">+{file.added}</span>
                          <span className="count-del">-{file.removed}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Diff Header */}
                <div className="diff-file-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IconFileCode size={15} style={{ color: 'var(--text-primary)' }} />
                    <span className="diff-header-filename">{currentFile?.path}</span>
                    {focusedLine && (
                      <span className="badge badge-info" style={{ fontSize: 10, marginLeft: 6 }}>
                        Focusing line {focusedLine}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {focusedLine && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setFocusedLine(null)}
                        style={{ fontSize: 10, padding: '2px 8px' }}
                      >
                        Clear Highlight
                      </button>
                    )}
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => copyToClipboard(diff)}
                      title="Copy diff to clipboard"
                      style={{ fontSize: 11, padding: '3px 8px' }}
                    >
                      {copiedCode === diff ? <IconCheck size={12} /> : <IconCopy size={12} />}
                      <span>{copiedCode === diff ? 'Copied' : 'Copy Patch'}</span>
                    </button>
                  </div>
                </div>

                {/* Code Lines Display */}
                <div className="diff-code-canvas">
                  {currentFile?.lines?.map((line, idx) => {
                    const isAdd = line.type === 'add';
                    const isDel = line.type === 'del';
                    const isHunk = line.type === 'hunk';
                    const isMeta = line.type === 'meta';
                    const isLineFocused = focusedLine != null && (line.newLine === focusedLine || line.oldLine === focusedLine);

                    return (
                      <div
                        key={idx}
                        id={line.newLine ? `diff-line-new-${line.newLine}` : line.oldLine ? `diff-line-old-${line.oldLine}` : undefined}
                        className={`diff-line-row ${
                          isAdd ? 'line-add' : isDel ? 'line-del' : isHunk ? 'line-hunk' : isMeta ? 'line-meta' : 'line-ctx'
                        } ${isLineFocused ? 'line-focused' : ''}`}
                      >
                        {/* Old line number */}
                        <span className="line-num old-num">
                          {line.oldLine || ''}
                        </span>

                        {/* New line number */}
                        <span className="line-num new-num">
                          {line.newLine || ''}
                        </span>

                        {/* Prefix indicator */}
                        <span className="line-prefix">
                          {isAdd ? '+' : isDel ? '-' : isHunk ? ' ' : ' '}
                        </span>

                        {/* Line content */}
                        <span className="line-content">
                          {line.content.replace(/^[+-]/, '')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3: Reviewer Questions ───────────────────────────── */}
          {activeTab === 'checklist' && (
            <div className="pr-tab-content fade-in">
              <div className="card">
                <div className="section-title-row" style={{ marginBottom: 16 }}>
                  <div>
                    <h3 className="card-title">Likely Reviewer Questions & Review Prompts</h3>
                    <p className="subheading-desc">Critical architectural concerns to query the author during PR review</p>
                  </div>
                  <span className="micro-tag">
                    {checkedQuestions.size}/{analysis.reviewer_questions?.length || 0} Verified
                  </span>
                </div>

                <div className="reviewer-questions-list">
                  {analysis.reviewer_questions?.map((q, idx) => {
                    const isChecked = checkedQuestions.has(idx);
                    return (
                      <div
                        key={idx}
                        className={`reviewer-question-item cursor-target ${isChecked ? 'question-done' : ''}`}
                        onClick={() => toggleQuestionCheck(idx)}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="question-checkbox"
                        />
                        <div className="question-content">
                          <span className="question-text">{q}</span>
                          <span className="question-hint">Click to mark reviewed</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PR History Modal / Drawer ────────────────────────────── */}
      {showHistory && (
        <div className="modal-backdrop fade-in" onClick={() => setShowHistory(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: 640 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <IconHistory size={18} style={{ color: 'var(--text-primary)' }} />
                <h3 className="tour-header-title">Pull Request Analysis History</h3>
              </div>
              <button className="btn-icon-close cursor-target" onClick={() => setShowHistory(false)}>
                <IconX size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
              {history.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="card history-item-card cursor-target"
                      style={{
                        padding: '14px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      onClick={() => handleSelectHistoryItem(item)}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span className={`badge badge-${item.risk_level?.toLowerCase()}`}>
                            {item.risk_level} ({item.risk_score})
                          </span>
                          <strong style={{ fontSize: 13.5 }}>{item.pr_title || 'Untitled PR'}</strong>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {new Date(item.created_at).toLocaleString()} &bull;{' '}
                          {item.violations?.length || 0} violations &bull;{' '}
                          {item.changed_components?.join(', ')}
                        </span>
                      </div>
                      <IconChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: 24 }}>
                  <IconHistory size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No historical PR analyses saved yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
