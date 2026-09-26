import React, { useState, useRef, useMemo } from 'react';
import { repositoryApi } from '../services/api';
import {
  IconRepository,
  IconFolder,
  IconPlay,
  IconSearch,
  IconFilter,
  IconCheck,
  IconCopy,
  IconCode,
  IconServer,
  IconFileCode,
  IconTerminal,
} from '../components/Icons';

const LANGUAGE_COLORS = {
  Python: '#F97316',
  TypeScript: '#EA580C',
  JavaScript: '#18181B',
  SQL: '#3F3F46',
  YAML: '#71717A',
  Markdown: '#A1A1AA',
  HTML: '#FB923C',
  CSS: '#C2410C',
  Other: '#D4D4D8',
};

export default function RepositoryPage({ activeRepo, setActiveRepo }) {
  const [mode, setMode] = useState('demo'); // demo | path | upload
  const [path, setPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [depSearch, setDepSearch] = useState('');
  const [depFilter, setDepFilter] = useState('all'); // all | runtime | dev
  const [copiedFile, setCopiedFile] = useState(null);
  const fileRef = useRef(null);

  const analysis = activeRepo?.analysis_result;

  async function handleLoadDemo() {
    setLoading(true);
    setError(null);
    try {
      const repo = await repositoryApi.loadDemo();
      setActiveRepo(repo);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyzePath(e) {
    if (e) e.preventDefault();
    if (!path.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const repo = await repositoryApi.analyze(path.trim());
      setActiveRepo(repo);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e) {
    if (e) e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const repo = await repositoryApi.upload(file);
      setActiveRepo(repo);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const handleCopyPath = (filePath) => {
    navigator.clipboard.writeText(filePath);
    setCopiedFile(filePath);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  // Filtered dependencies
  const dependencies = analysis?.dependencies;
  const filteredDependencies = useMemo(() => {
    if (!dependencies) return [];
    return dependencies.filter((d) => {
      const matchesSearch = d.name.toLowerCase().includes(depSearch.toLowerCase());
      const matchesType = depFilter === 'all' || d.type === depFilter;
      return matchesSearch && matchesType;
    });
  }, [dependencies, depSearch, depFilter]);

  const runtimeCount = dependencies?.filter((d) => d.type === 'runtime').length || 0;
  const devCount = dependencies?.filter((d) => d.type === 'dev').length || 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Repository Analyzer</h2>
        <p>Ingest a local codebase, upload an archive, or test with the built-in enterprise eCommerce demo</p>
      </div>

      {/* ── Segmented Source Selection Tabs ─────────────────────────── */}
      <div className="card fade-in" style={{ marginBottom: 28 }}>
        <div className="source-segmented-control">
          <button
            className={`source-tab-btn cursor-target ${mode === 'demo' ? 'active' : ''}`}
            onClick={() => setMode('demo')}
          >
            <IconPlay size={15} />
            <span>Built-in Demo Repository</span>
          </button>
          <button
            className={`source-tab-btn cursor-target ${mode === 'path' ? 'active' : ''}`}
            onClick={() => setMode('path')}
          >
            <IconFolder size={15} />
            <span>Local Directory Path</span>
          </button>
          <button
            className={`source-tab-btn cursor-target ${mode === 'upload' ? 'active' : ''}`}
            onClick={() => setMode('upload')}
          >
            <IconServer size={15} />
            <span>Upload Archive (.ZIP)</span>
          </button>
        </div>

        {/* Mode: Demo */}
        {mode === 'demo' && (
          <div className="source-tab-content">
            <div className="demo-overview-box">
              <div className="demo-badge-row">
                <span className="source-type-pill">PRE-PACKAGED DATASET</span>
                <span className="source-stack-pill">FastAPI &bull; React &bull; SQLAlchemy &bull; Celery</span>
              </div>
              <h3 className="source-title">ShopFlow Platform Demo</h3>
              <p className="source-desc">
                Simulates an eCommerce backend & frontend with authentic micro-components: JWT authentication service,
                Stripe payment processor, Celery async task workers, and intentional architectural violations ready for audit.
              </p>
            </div>
            <button className="btn btn-primary cursor-target" onClick={handleLoadDemo} disabled={loading}>
              <IconPlay size={16} />
              <span>{loading ? 'Analyzing Codebase...' : 'Load ShopFlow Platform Demo'}</span>
            </button>
          </div>
        )}

        {/* Mode: Local Path */}
        {mode === 'path' && (
          <form className="source-tab-content" onSubmit={handleAnalyzePath}>
            <div className="form-group">
              <label className="form-label">Absolute Directory Path</label>
              <div className="input-with-icon">
                <IconTerminal size={16} className="input-icon" />
                <input
                  className="input with-icon"
                  placeholder="e.g. C:\projects\my-service or /home/developer/codebase"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                />
              </div>
              <p className="field-hint">
                Provide the full filesystem path to your repository root containing source files and package manifests.
              </p>
            </div>
            <button className="btn btn-primary cursor-target" type="submit" disabled={loading || !path.trim()}>
              <IconSearch size={16} />
              <span>{loading ? 'Scanning Directory...' : 'Scan & Analyze Codebase'}</span>
            </button>
          </form>
        )}

        {/* Mode: Upload ZIP */}
        {mode === 'upload' && (
          <form className="source-tab-content" onSubmit={handleUpload}>
            <div className="form-group">
              <label className="form-label">Repository Archive (.ZIP)</label>
              <div
                className="file-dropzone-box cursor-target"
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".zip"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setSelectedFileName(file.name);
                  }}
                />
                <IconFolder size={28} className="dropzone-icon" />
                <div className="dropzone-text">
                  <strong>Click to select a ZIP archive</strong>
                  <span>{selectedFileName || 'Supports standard ZIP repositories with root manifests'}</span>
                </div>
              </div>
            </div>
            <button className="btn btn-primary cursor-target" type="submit" disabled={loading || !selectedFileName}>
              <IconServer size={16} />
              <span>{loading ? 'Extracting & Scanning...' : 'Upload & Analyze Codebase'}</span>
            </button>
          </form>
        )}

        {error && <p className="dashboard-error-text" style={{ marginTop: 14 }}>{error}</p>}
      </div>

      {/* ── Analysis Results Overview ─────────────────────────────── */}
      {analysis && (
        <>
          {/* Repository Summary Card */}
          <div className="card fade-in" style={{ marginBottom: 20 }}>
            <div className="repo-summary-header">
              <div>
                <div className="dashboard-tag-row">
                  <span className="project-badge">{activeRepo.source_type?.toUpperCase()} SOURCE</span>
                  <span className="branch-badge">ready for inspection</span>
                </div>
                <h3 className="repo-summary-title">{analysis.project_name}</h3>
                <p className="repo-summary-subtitle">
                  <strong>{analysis.total_files}</strong> files &bull;{' '}
                  <strong>{analysis.total_lines?.toLocaleString()}</strong> lines of code analyzed
                </p>
              </div>

              <div className="repo-summary-score">
                <div className="score-circle">{analysis.health_score}</div>
                <span className="score-caption">Health Index</span>
              </div>
            </div>

            <div className="framework-chips-row">
              {analysis.frameworks?.map((f) => (
                <span key={f} className="framework-badge">
                  <IconCode size={13} />
                  <span>{f}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Languages & Dependencies Grid */}
          <div className="grid-2 stagger-group" style={{ marginBottom: 20 }}>
            {/* Languages Stacked Bar & Table */}
            <div className="card fade-in">
              <div className="section-title-row" style={{ marginBottom: 14 }}>
                <h3 className="card-title">Languages & Codebase Composition</h3>
                <span className="micro-tag">{analysis.languages?.length || 0} languages</span>
              </div>

              {/* Stacked bar */}
              <div className="language-stacked-bar" style={{ marginBottom: 16 }}>
                {analysis.languages?.map((l) => (
                  <div
                    key={l.name}
                    className="lang-segment"
                    style={{
                      width: `${l.percentage}%`,
                      backgroundColor: LANGUAGE_COLORS[l.name] || LANGUAGE_COLORS.Other,
                    }}
                    title={`${l.name}: ${l.percentage}%`}
                  />
                ))}
              </div>

              {/* Table */}
              <div className="lang-list-container">
                {analysis.languages?.map((l) => (
                  <div key={l.name} className="lang-row-item">
                    <div className="lang-name-block">
                      <span
                        className="lang-color-dot"
                        style={{ backgroundColor: LANGUAGE_COLORS[l.name] || LANGUAGE_COLORS.Other }}
                      />
                      <span className="lang-label">{l.name}</span>
                    </div>
                    <div className="lang-meta-block">
                      <span className="lang-file-count">{l.files} files</span>
                      <span className="lang-percentage">{l.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dependencies Explorer with Search & Filter */}
            <div className="card fade-in">
              <div className="section-title-row" style={{ marginBottom: 12 }}>
                <h3 className="card-title">Package Dependencies</h3>
                <span className="micro-tag">{analysis.dependencies?.length || 0} installed</span>
              </div>

              {/* Search & Filter Bar */}
              <div className="dep-toolbar-row">
                <div className="dep-search-wrap">
                  <IconSearch size={14} className="dep-search-icon" />
                  <input
                    className="dep-search-input"
                    placeholder="Search package name..."
                    value={depSearch}
                    onChange={(e) => setDepSearch(e.target.value)}
                  />
                </div>
                <div className="dep-filter-buttons">
                  <IconFilter size={13} style={{ color: 'var(--text-muted)', marginRight: 2 }} />
                  <button
                    className={`dep-filter-btn cursor-target ${depFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setDepFilter('all')}
                  >
                    All ({analysis.dependencies?.length || 0})
                  </button>
                  <button
                    className={`dep-filter-btn cursor-target ${depFilter === 'runtime' ? 'active' : ''}`}
                    onClick={() => setDepFilter('runtime')}
                  >
                    Runtime ({runtimeCount})
                  </button>
                  <button
                    className={`dep-filter-btn cursor-target ${depFilter === 'dev' ? 'active' : ''}`}
                    onClick={() => setDepFilter('dev')}
                  >
                    Dev ({devCount})
                  </button>
                </div>
              </div>

              {/* Filtered Dependencies List */}
              <div className="dep-scroll-table">
                {filteredDependencies.length > 0 ? (
                  filteredDependencies.map((d, i) => (
                    <div key={i} className="dep-row-item">
                      <div className="dep-name-wrap">
                        <span className="dep-name">{d.name}</span>
                        {d.version && <span className="dep-version">v{d.version}</span>}
                      </div>
                      <span className={`badge ${d.type === 'dev' ? 'badge-info' : 'badge-low'}`}>
                        {d.type}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="dep-empty-text">No dependencies matching search criteria.</p>
                )}
              </div>
            </div>
          </div>

          {/* Key Files and Directory Hierarchy */}
          <div className="grid-2">
            {/* Key Entry Points / Important Files */}
            <div className="card fade-in">
              <div className="section-title-row" style={{ marginBottom: 14 }}>
                <h3 className="card-title">Detected Entry Points & Configs</h3>
                <span className="micro-tag">{analysis.important_files?.length || 0} files</span>
              </div>

              <div className="files-scroll-list">
                {analysis.important_files?.map((f, i) => (
                  <div key={i} className="code-file-item">
                    <div className="code-file-left">
                      <IconFileCode size={15} className="file-icon-svg" />
                      <span className="file-path-text">{f}</span>
                    </div>
                    <button
                      className="btn-icon-action cursor-target"
                      onClick={() => handleCopyPath(f)}
                      title="Copy path to clipboard"
                    >
                      {copiedFile === f ? <IconCheck size={13} style={{ color: 'var(--accent-green)' }} /> : <IconCopy size={13} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Significant Directories */}
            <div className="card fade-in">
              <div className="section-title-row" style={{ marginBottom: 14 }}>
                <h3 className="card-title">Discovered Directory Structure</h3>
                <span className="micro-tag">{analysis.directories?.length || 0} modules</span>
              </div>

              <div className="files-scroll-list">
                {analysis.directories?.map((d, i) => (
                  <div key={i} className="code-file-item">
                    <div className="code-file-left">
                      <IconFolder size={15} className="folder-icon-svg" />
                      <span className="file-path-text">{d}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!analysis && !loading && (
        <div className="empty-state fade-in">
          <div className="empty-icon-wrap">
            <IconRepository size={36} />
          </div>
          <h3>No Repository Loaded</h3>
          <p>Select a source above to begin codebase architecture and guardrails analysis.</p>
        </div>
      )}
    </div>
  );
}
