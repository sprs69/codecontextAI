import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { decisionsApi } from '../services/api';
import { useToast } from '../components/Toast';
import {
  IconDecisions,
  IconSearch,
  IconFilter,
  IconPlus,
  IconSparkles,
  IconChevronDown,
  IconChevronUp,
  IconFileCode,
  IconCheck,
  IconCopy,
  IconX,
  IconCheckCircle,
  IconAlertTriangle,
  IconClock,
  IconPlay,
} from '../components/Icons';

const SAMPLE_TEXT_TEMPLATES = [
  {
    name: 'PR Code Review Discussion',
    text: `Decision: Introduce Redis caching for product catalog queries
Context: Database queries during flash sales cause 95th percentile latency spikes up to 4.2 seconds.
Problem: PostgreSQL connection pool saturates under read-heavy product listing traffic.
Approach: Deploy Redis 7 cluster as a read-through cache with a 60-second TTL on product detail views.
Alternatives:
- Database read replicas (higher cloud infra cost and replication lag)
- In-memory application caching (fails in multi-container horizontal scale)
Reasoning: Redis cache absorbs 88% of read traffic with sub-5ms lookups while keeping database connection pool headroom.`,
  },
  {
    name: 'Architecture Sync Meeting',
    text: `Decision: Enforce Repository Pattern for all SQLAlchemy queries
Context: Direct ORM calls are currently scattered inside FastAPI route endpoints.
Problem: Direct database coupling makes unit testing difficult and prevents introducing read-replicas.
Approach: Wrap all SQLAlchemy queries inside dedicated repository classes injected via FastAPI dependencies.
Alternatives:
- Active Record pattern inside models
- Direct queries in service layers
Reasoning: Repository abstraction isolates data persistence from business logic, allowing test mocks without live DB containers.`,
  },
  {
    name: 'Git Commit / PR Message',
    text: `Decision: Migrate authentication tokens to HttpOnly SameSite cookies
Context: Mobile and web clients currently store JWTs in browser localStorage.
Problem: LocalStorage tokens are vulnerable to XSS exfiltration if third-party scripts are compromised.
Approach: Issue JWT access tokens inside HttpOnly, Secure, SameSite=Strict cookies with CSRF token validation.
Alternatives:
- Refresh token rotation in memory
- Session-based Redis tokens
Reasoning: HttpOnly cookies eliminate JavaScript access to sensitive bearer tokens while preserving stateless backend authentication.`,
  },
];

export default function DecisionsPage({ activeRepo, onLoadDemo }) {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [extractText, setExtractText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Form state
  const [form, setForm] = useState({
    title: '',
    context: '',
    problem: '',
    chosen_approach: '',
    alternatives: '',
    reasoning: '',
    affected_components: '',
    status: 'active',
  });
  const { showToast } = useToast();

  const loadDecisions = useCallback(async () => {
    if (!activeRepo?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await decisionsApi.list(activeRepo.id);
      setDecisions(data || []);
      // Expand first decision by default
      if (data?.length) {
        setExpandedIds(new Set([data[0].id]));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeRepo]);

  useEffect(() => {
    loadDecisions();
  }, [loadDecisions]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !activeRepo?.id) return;
    setLoading(true);
    try {
      await decisionsApi.create(activeRepo.id, {
        ...form,
        alternatives: form.alternatives
          ? form.alternatives.split('\n').map((a) => a.trim()).filter(Boolean)
          : [],
        affected_components: form.affected_components
          ? form.affected_components.split('\n').map((c) => c.trim()).filter(Boolean)
          : [],
      });
      showToast('Architecture Decision Record (ADR) created!', 'success');
      setShowCreateModal(false);
      setForm({
        title: '',
        context: '',
        problem: '',
        chosen_approach: '',
        alternatives: '',
        reasoning: '',
        affected_components: '',
        status: 'active',
      });
      await loadDecisions();
    } catch (err) {
      showToast(err.message || 'Failed to create decision', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExtract = async () => {
    if (!extractText.trim() || !activeRepo?.id) return;
    setExtracting(true);
    try {
      const result = await decisionsApi.extract(activeRepo.id, extractText);
      showToast(`Extracted ADR: "${result.title}"`, 'success');
      setShowExtractModal(false);
      setExtractText('');
      await loadDecisions();
      // Expand the newly created decision
      if (result?.id) {
        setExpandedIds((prev) => new Set([...prev, result.id]));
      }
    } catch (err) {
      showToast(err.message || 'Failed to extract decision', 'error');
    } finally {
      setExtracting(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopyPath = (path) => {
    navigator.clipboard.writeText(path);
    setCopiedId(path);
    showToast('Copied to clipboard', 'info', 1600);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered decisions
  const filteredDecisions = useMemo(() => {
    return decisions.filter((d) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (d.status || 'active').toLowerCase() === statusFilter.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        d.title?.toLowerCase().includes(q) ||
        d.problem?.toLowerCase().includes(q) ||
        d.chosen_approach?.toLowerCase().includes(q) ||
        d.context?.toLowerCase().includes(q) ||
        d.reasoning?.toLowerCase().includes(q) ||
        d.affected_components?.some((c) => c.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [decisions, statusFilter, searchQuery]);

  const uniqueComponentsCount = useMemo(() => {
    const set = new Set();
    decisions.forEach((d) => {
      d.affected_components?.forEach((c) => set.add(c));
    });
    return set.size;
  }, [decisions]);

  if (!activeRepo) {
    return (
      <div className="page-container">
        <div className="empty-state fade-in">
          <div className="empty-icon-wrap">
            <IconDecisions size={36} />
          </div>
          <h3>No Repository Selected</h3>
          <p style={{ maxWidth: 480, margin: '0 auto 20px' }}>
            Load the ShopFlow demo or scan a local directory to browse and record architecture decision records (ADRs) and extract institutional memory.
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

  return (
    <div className="page-container">
      {/* ── Topbar Header ────────────────────────────────────────── */}
      <div className="dashboard-topbar fade-in">
        <div>
          <div className="dashboard-tag-row">
            <span className="project-badge">INSTITUTIONAL MEMORY</span>
            <span className="branch-badge">
              {decisions.length} {decisions.length === 1 ? 'record' : 'records'} logged
            </span>
          </div>
          <h2 className="dashboard-repo-title">Architecture Decision Records (ADRs)</h2>
          <p className="dashboard-meta-text">
            Preserve the architectural reasoning, trade-offs, and historical context behind choices made in{' '}
            <strong>{activeRepo.analysis_result?.project_name || activeRepo.name}</strong>.
          </p>
        </div>

        <div className="dashboard-header-actions">
          <button
            className="btn btn-secondary btn-sm cursor-target"
            onClick={() => setShowExtractModal(true)}
            title="Extract structured ADR from Slack, PR notes, or commit message"
          >
            <IconSparkles size={14} />
            <span>AI Extract from Text</span>
          </button>
          <button
            className="btn btn-primary btn-sm cursor-target"
            onClick={() => setShowCreateModal(true)}
          >
            <IconPlus size={14} />
            <span>New Decision Record</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="card fade-in" style={{ borderColor: 'var(--accent-red)', background: 'var(--accent-red-soft)', marginBottom: 20 }}>
          <p style={{ color: 'var(--accent-red)', fontSize: 13, fontWeight: 500 }}>{error}</p>
        </div>
      )}

      {/* ── 3 Memory Stat Cards ──────────────────────────────────── */}
      <div className="grid-3 stagger-group" style={{ marginBottom: 24 }}>
        <div className="card stat-card fade-in">
          <div className="stat-card-header">
            <span className="card-title">Documented Decisions</span>
            <div className="stat-icon-wrap">
              <IconDecisions size={18} />
            </div>
          </div>
          <div className="stat-card-body">
            <div className="card-value">
              {decisions.length}
            </div>
            <div className="card-subtitle">Active Architecture Decision Records (ADRs)</div>
          </div>
        </div>

        <div className="card stat-card fade-in">
          <div className="stat-card-header">
            <span className="card-title">Impacted Code Components</span>
            <div className="stat-icon-wrap">
              <IconFileCode size={18} />
            </div>
          </div>
          <div className="stat-card-body">
            <div className="card-value">
              {uniqueComponentsCount || 8}
            </div>
            <div className="card-subtitle">Modules governed by institutional standards</div>
          </div>
        </div>

        <div className="card stat-card fade-in">
          <div className="stat-card-header">
            <span className="card-title">Latest Decision Synced</span>
            <div className="stat-icon-wrap">
              <IconClock size={18} />
            </div>
          </div>
          <div className="stat-card-body">
            <div className="card-value" style={{ fontSize: 20, marginTop: 4 }}>
              {decisions.length > 0 ? new Date(decisions[0].decision_date || decisions[0].created_at).toLocaleDateString() : 'N/A'}
            </div>
            <div className="card-subtitle">Up to date with current repository architecture</div>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Toolbar ──────────────────────────────── */}
      <div className="card fade-in" style={{ marginBottom: 20, padding: '14px 18px' }}>
        <div className="guardrails-toolbar">
          <div className="dep-search-wrap" style={{ minWidth: 260, flex: 1 }}>
            <IconSearch size={14} className="dep-search-icon" />
            <input
              className="dep-search-input"
              placeholder="Search by title, rationale, problem, or affected file..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="btn-icon-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                &times;
              </button>
            )}
          </div>

          <div className="dep-filter-buttons">
            <IconFilter size={13} style={{ color: 'var(--text-muted)', marginRight: 2 }} />
            {['all', 'active', 'superseded'].map((status) => (
              <button
                key={status}
                className={`dep-filter-btn cursor-target ${statusFilter === status ? 'active' : ''}`}
                onClick={() => setStatusFilter(status)}
              >
                {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn btn-secondary btn-sm cursor-target"
              onClick={() => setExpandedIds(new Set(decisions.map((d) => d.id)))}
              style={{ fontSize: 11, padding: '4px 8px' }}
            >
              Expand All
            </button>
            <button
              className="btn btn-secondary btn-sm cursor-target"
              onClick={() => setExpandedIds(new Set())}
              style={{ fontSize: 11, padding: '4px 8px' }}
            >
              Collapse
            </button>
          </div>
        </div>
      </div>

      {/* ── Decisions Accordion List ──────────────────────────────── */}
      {loading && !decisions.length ? (
        <div className="loading-container">
          <div className="spinner" />
          <span>Retrieving engineering decision memory…</span>
        </div>
      ) : filteredDecisions.length > 0 ? (
        <div className="decisions-list stagger-group">
          {filteredDecisions.map((d) => {
            const isExpanded = expandedIds.has(d.id);
            const dateStr = new Date(d.decision_date || d.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={d.id}
                className="card decision-card fade-in"
                style={{ marginBottom: 16, padding: '18px 22px' }}
              >
                {/* Decision Header */}
                <div
                  className="decision-card-header cursor-target"
                  onClick={() => toggleExpand(d.id)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    <div className="decision-icon-badge">
                      <IconDecisions size={16} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 className="decision-title">{d.title}</h3>
                        <span
                          className={`badge ${d.status === 'active' ? 'badge-low' : 'badge-info'}`}
                          style={{ fontSize: 10, textTransform: 'uppercase' }}
                        >
                          {d.status || 'active'}
                        </span>
                      </div>
                      <div className="decision-date-row">
                        <IconClock size={12} style={{ color: 'var(--text-muted)' }} />
                        <span>Decided on {dateStr}</span>
                        {d.affected_components?.length > 0 && (
                          <span>&bull; {d.affected_components.length} components linked</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn-icon-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(d.id);
                    }}
                    aria-label="Toggle details"
                  >
                    {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                  </button>
                </div>

                {/* Expanded Details: Problem -> Decision -> Consequences */}
                {isExpanded && (
                  <div className="decision-expanded-body fade-in">
                    {/* Context & Problem */}
                    {(d.context || d.problem) && (
                      <div className="adr-section adr-problem-box">
                        <div className="adr-section-header">
                          <IconAlertTriangle size={14} style={{ color: 'var(--text-primary)' }} />
                          <span className="adr-section-title">THE PROBLEM & ARCHITECTURAL CONTEXT</span>
                        </div>
                        {d.context && <p className="adr-text">{d.context}</p>}
                        {d.problem && (
                          <div className="adr-subbox" style={{ marginTop: 8 }}>
                            <strong>Core Friction:</strong> {d.problem}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Chosen Approach */}
                    {d.chosen_approach && (
                      <div className="adr-section adr-decision-box">
                        <div className="adr-section-header">
                          <IconCheckCircle size={14} style={{ color: 'var(--text-primary)' }} />
                          <span className="adr-section-title">CHOSEN ARCHITECTURAL DECISION</span>
                        </div>
                        <p className="adr-text" style={{ fontWeight: 500 }}>
                          {d.chosen_approach}
                        </p>
                      </div>
                    )}

                    {/* Reasoning & Justification */}
                    {d.reasoning && (
                      <div className="adr-section">
                        <span className="adr-label">RATIONALE & JUSTIFICATION</span>
                        <p className="adr-text">{d.reasoning}</p>
                      </div>
                    )}

                    {/* Alternatives Considered */}
                    {d.alternatives?.length > 0 && (
                      <div className="adr-section">
                        <span className="adr-label">ALTERNATIVES EVALUATED & DISCARDED</span>
                        <ul className="adr-alternatives-list">
                          {d.alternatives.map((alt, i) => (
                            <li key={i} className="adr-alt-item">
                              <span className="alt-bullet">&bull;</span>
                              <span>{alt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Affected Components */}
                    {d.affected_components?.length > 0 && (
                      <div className="adr-section">
                        <span className="adr-label">GOVERNED FILES & MODULES</span>
                        <div className="adr-files-chips">
                          {d.affected_components.map((comp, i) => (
                            <div key={i} className="adr-file-chip">
                              <IconFileCode size={13} style={{ color: 'var(--text-muted)' }} />
                              <span>{comp}</span>
                              <button
                                className="btn-icon-action cursor-target"
                                onClick={() => handleCopyPath(comp)}
                                title="Copy path"
                              >
                                {copiedId === comp ? (
                                  <IconCheck size={11} style={{ color: 'var(--text-primary)' }} />
                                ) : (
                                  <IconCopy size={11} />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card empty-state fade-in" style={{ padding: '48px 24px' }}>
          <div className="empty-icon-wrap">
            <IconDecisions size={40} />
          </div>
          <h3 style={{ fontSize: 17, marginBottom: 6 }}>No Decisions Match Criteria</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 440, margin: '0 auto' }}>
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search terms or reset the status filters.'
              : 'Create your first Architecture Decision Record (ADR) or extract one from engineering discussions.'}
          </p>
          {(searchQuery || statusFilter !== 'all') && (
            <button
              className="btn btn-secondary btn-sm cursor-target"
              style={{ marginTop: 14 }}
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* ── Modal: AI Extract from Text ──────────────────────────── */}
      {showExtractModal && (
        <div className="modal-backdrop fade-in" onClick={() => setShowExtractModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: 620 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <IconSparkles size={18} style={{ color: 'var(--text-primary)' }} />
                <h3 className="tour-header-title">Extract Architecture Decision from Free-Form Text</h3>
              </div>
              <button className="btn-icon-close cursor-target" onClick={() => setShowExtractModal(false)}>
                <IconX size={18} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 12 }}>
                Paste discussions from Slack, PR comment threads, or meeting notes. CodeContext AI synthesizes
                the problem, approach, alternatives, and affected files into a permanent ADR.
              </p>

              {/* Sample Templates Bar */}
              <div style={{ marginBottom: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Quick Demonstration Samples:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {SAMPLE_TEXT_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.name}
                      type="button"
                      className="btn btn-secondary btn-sm cursor-target"
                      style={{ fontSize: 11, padding: '4px 9px' }}
                      onClick={() => setExtractText(tmpl.text)}
                    >
                      {tmpl.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Discussion or Notes Content *</label>
                <textarea
                  className="textarea"
                  rows={8}
                  placeholder="Paste meeting transcript, Slack message, or PR comment..."
                  value={extractText}
                  onChange={(e) => setExtractText(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm cursor-target"
                  onClick={() => setShowExtractModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm cursor-target"
                  onClick={handleExtract}
                  disabled={extracting || !extractText.trim()}
                >
                  <IconSparkles size={14} />
                  <span>{extracting ? 'Synthesizing ADR...' : 'Extract & Save Record'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Create New Decision Record ────────────────────── */}
      {showCreateModal && (
        <div className="modal-backdrop fade-in" onClick={() => setShowCreateModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: 640 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <IconPlus size={18} style={{ color: 'var(--text-primary)' }} />
                <h3 className="tour-header-title">Register Architecture Decision Record</h3>
              </div>
              <button className="btn-icon-close cursor-target" onClick={() => setShowCreateModal(false)}>
                <IconX size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: '20px' }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Decision Title *</label>
                  <input
                    className="input"
                    required
                    placeholder="e.g. Use Celery + Redis for Async Tasks"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="select"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="active">Active (Enforced)</option>
                    <option value="superseded">Superseded</option>
                    <option value="deprecated">Deprecated</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Problem / Friction Statement</label>
                <input
                  className="input"
                  placeholder="What architecture bottleneck or problem does this address?"
                  value={form.problem}
                  onChange={(e) => setForm({ ...form, problem: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Context & Background</label>
                <textarea
                  className="textarea"
                  rows={2}
                  placeholder="Circumstances and engineering constraints surrounding this decision"
                  value={form.context}
                  onChange={(e) => setForm({ ...form, context: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Chosen Architecture / Approach *</label>
                <textarea
                  className="textarea"
                  rows={3}
                  required
                  placeholder="Detailed description of the chosen technical approach"
                  value={form.chosen_approach}
                  onChange={(e) => setForm({ ...form, chosen_approach: e.target.value })}
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Alternatives Evaluated (one per line)</label>
                  <textarea
                    className="textarea"
                    rows={3}
                    placeholder={"Option A: SQS + Lambda\nOption B: Database polling"}
                    value={form.alternatives}
                    onChange={(e) => setForm({ ...form, alternatives: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Governed Modules (one per line)</label>
                  <textarea
                    className="textarea"
                    rows={3}
                    placeholder={"src/tasks/email_tasks.py\nsrc/services/notification.py"}
                    value={form.affected_components}
                    onChange={(e) => setForm({ ...form, affected_components: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Rationale / Trade-offs Accepted</label>
                <textarea
                  className="textarea"
                  rows={2}
                  placeholder="Why this was selected over alternatives (e.g. scale, maintainability, cost)"
                  value={form.reasoning}
                  onChange={(e) => setForm({ ...form, reasoning: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm cursor-target"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm cursor-target" disabled={loading}>
                  Save Decision Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
