import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { guardrailsApi, architectureApi } from '../services/api';
import { useToast } from '../components/Toast';
import {
  IconGuardrails,
  IconShield,
  IconSearch,
  IconFilter,
  IconCheckCircle,
  IconCheck,
  IconCopy,
  IconFileCode,
  IconRefresh,
  IconChevronDown,
  IconChevronUp,
  IconPlay,
} from '../components/Icons';

export default function GuardrailsPage({ activeRepo, onLoadDemo }) {
  const [violations, setViolations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [rules, setRules] = useState([]);
  const [selectedRule, setSelectedRule] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [copiedPath, setCopiedPath] = useState(null);
  const { showToast } = useToast();

  const loadData = useCallback(async () => {
    if (!activeRepo?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [v, s, r] = await Promise.all([
        guardrailsApi.getViolations(activeRepo.id),
        guardrailsApi.getSummary(activeRepo.id),
        architectureApi.getRules(activeRepo.id).catch(() => []),
      ]);
      setViolations(v || []);
      setSummary(s);
      setRules(r || []);
      // Auto-expand all high severity violations initially
      const initialExpanded = new Set();
      v?.forEach((violation) => {
        if (violation.severity === 'HIGH' || violation.status === 'open') {
          initialExpanded.add(violation.id);
        }
      });
      setExpandedIds(initialExpanded);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeRepo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (violationId, newStatus) => {
    setUpdatingId(violationId);
    try {
      await guardrailsApi.updateStatus(activeRepo.id, violationId, newStatus);
      showToast(
        `Violation marked as ${newStatus}`,
        newStatus === 'resolved' ? 'success' : 'info'
      );
      // Update local state smoothly
      setViolations((prev) =>
        prev.map((v) => (v.id === violationId ? { ...v, status: newStatus } : v))
      );
      // Refresh summary
      const s = await guardrailsApi.getSummary(activeRepo.id);
      setSummary(s);
    } catch (e) {
      showToast(e.message || 'Failed to update status', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCopyPath = (filePath, lineNumber) => {
    const text = lineNumber ? `${filePath}:${lineNumber}` : filePath;
    navigator.clipboard.writeText(text);
    setCopiedPath(text);
    showToast('File path copied to clipboard', 'info', 1800);
    setTimeout(() => setCopiedPath(null), 2000);
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

  const expandAll = () => {
    setExpandedIds(new Set(violations.map((v) => v.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Filtered violations
  const filteredViolations = useMemo(() => {
    return violations.filter((v) => {
      if (selectedRule) {
        const vRule = (v.rule || '').toLowerCase();
        const sRule = (selectedRule.rule || '').toLowerCase();
        const matchesRule = vRule.includes(sRule) || sRule.includes(vRule);
        if (!matchesRule) return false;
      }
      const matchesSeverity =
        severityFilter === 'all' || v.severity === severityFilter;
      const matchesStatus =
        statusFilter === 'all' || v.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        v.rule?.toLowerCase().includes(q) ||
        v.file_path?.toLowerCase().includes(q) ||
        v.explanation?.toLowerCase().includes(q) ||
        v.suggested_fix?.toLowerCase().includes(q);

      return matchesSeverity && matchesStatus && matchesSearch;
    });
  }, [violations, selectedRule, severityFilter, statusFilter, searchQuery]);

  const openCount = violations.filter((v) => v.status === 'open').length;
  const resolvedCount = violations.filter((v) => v.status === 'resolved').length;
  const ignoredCount = violations.filter((v) => v.status === 'ignored').length;

  if (!activeRepo) {
    return (
      <div className="page-container">
        <div className="empty-state fade-in">
          <div className="empty-icon-wrap">
            <IconGuardrails size={36} />
          </div>
          <h3>No Repository Selected</h3>
          <p style={{ maxWidth: 480, margin: '0 auto 20px' }}>
            Load the ShopFlow demo or scan a local directory to audit architectural guardrail violations, rule constraints, and auto-fixes.
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
            <span className="project-badge">POLICY GOVERNANCE</span>
            <span className="branch-badge">
              {violations.length} {violations.length === 1 ? 'violation' : 'violations'} recorded
            </span>
          </div>
          <h2 className="dashboard-repo-title">Architectural Guardrails & Compliance</h2>
          <p className="dashboard-meta-text">
            Continuous boundary enforcement for <strong>{activeRepo.analysis_result?.project_name || activeRepo.name}</strong>.
            Audit structural violations, review actionable remediation code, and track resolution status.
          </p>
        </div>

        <div className="dashboard-header-actions">
          <button
            className="btn btn-secondary btn-sm cursor-target"
            onClick={loadData}
            disabled={loading}
            title="Refresh violations from backend"
          >
            <IconRefresh size={14} className={loading ? 'spin-icon' : ''} />
            <span>Sync Audit</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="card fade-in" style={{ borderColor: 'rgba(255,255,255,0.2)', marginBottom: 20 }}>
          <p style={{ color: 'var(--text-primary)', fontSize: 13 }}>{error}</p>
        </div>
      )}

      {/* ── 4 Governance Stat Cards ──────────────────────────────── */}
      <div className="grid-4 stagger-group" style={{ marginBottom: 24 }}>
        {/* Open Violations */}
        <div className="card stat-card fade-in">
          <div className="stat-card-header">
            <span className="card-title">Open Violations</span>
            <span className={`status-pill ${openCount > 0 ? 'pill-critical' : 'pill-good'}`}>
              {openCount > 0 ? 'ACTION REQUIRED' : 'CLEAN'}
            </span>
          </div>
          <div className="stat-card-body">
            <div className="card-value">
              {openCount}
              <span className="value-max">/{violations.length}</span>
            </div>
            <div className="card-subtitle">Active structural non-compliance issues</div>
          </div>
        </div>

        {/* High Severity */}
        <div className="card stat-card fade-in">
          <div className="stat-card-header">
            <span className="card-title">High Severity</span>
            <div className="stat-icon-wrap">
              <IconShield size={18} />
            </div>
          </div>
          <div className="stat-card-body">
            <div className="card-value">
              {summary?.summary?.HIGH || 0}
            </div>
            <div className="card-subtitle">Blocks pull request merges & deployments</div>
          </div>
        </div>

        {/* Medium Severity */}
        <div className="card stat-card fade-in">
          <div className="stat-card-header">
            <span className="card-title">Medium Severity</span>
            <div className="stat-icon-wrap">
              <IconShield size={18} />
            </div>
          </div>
          <div className="stat-card-body">
            <div className="card-value">
              {summary?.summary?.MEDIUM || 0}
            </div>
            <div className="card-subtitle">Requires architectural lead review & sign-off</div>
          </div>
        </div>

        {/* Resolved / Ignored */}
        <div className="card stat-card fade-in">
          <div className="stat-card-header">
            <span className="card-title">Resolved / Ignored</span>
            <div className="stat-icon-wrap">
              <IconCheckCircle size={18} />
            </div>
          </div>
          <div className="stat-card-body">
            <div className="card-value">
              {resolvedCount + ignoredCount}
            </div>
            <div className="card-subtitle" style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <span className="badge badge-low">{resolvedCount} resolved</span>
              <span className="badge badge-info">{ignoredCount} ignored</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Active Architectural Rules Policy Table ──────────────── */}
      <div className="card fade-in" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="micro-tag" style={{ letterSpacing: '0.12em' }}>ARCHITECTURAL RULES</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {rules.length} Active System Governance Policies
            </span>
          </div>
          <span className="micro-tag">
            {openCount} Open Violations
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rules.length > 0 ? (
            rules.map((rule, idx) => {
              const ruleName = (rule.rule || '').toLowerCase();
              const ruleViolations = violations.filter((v) => {
                const vRule = (v.rule || '').toLowerCase();
                return vRule.includes(ruleName) || ruleName.includes(vRule);
              });
              const count = ruleViolations.filter((v) => v.status === 'open').length;

              const isSelected = selectedRule?.rule === rule.rule;
              return (
                <div
                  key={rule.id || idx}
                  className="cursor-target"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: isSelected ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    border: isSelected ? '1px solid rgba(249, 115, 22, 0.4)' : '1px solid rgba(255, 255, 255, 0.10)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                  onClick={() => setSelectedRule((prev) => (prev?.rule === rule.rule ? null : rule))}
                  title={isSelected ? 'Click to deselect rule' : `Click to filter violations by: ${rule.rule}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: isSelected ? '#FB923C' : 'rgba(161, 161, 170, 0.7)' }}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span style={{ fontWeight: 500, color: '#F4F4F5' }}>
                      {rule.rule}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'rgba(161, 161, 170, 0.5)', fontSize: 11 }}>—</span>
                    <span
                      className={`badge ${count > 0 ? 'badge-high' : 'badge-low'}`}
                      style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}
                    >
                      {String(count).padStart(2, '0')} {count === 1 ? 'violation' : 'violations'}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 0' }}>
              System architecture rules active and enforced.
            </div>
          )}
        </div>
      </div>

      {/* ── Active Rule Filter Banner ────────────────────────────── */}
      {selectedRule && (
        <div
          className="card fade-in"
          style={{
            marginBottom: 20,
            padding: '12px 18px',
            background: 'var(--accent-orange-tint)',
            border: '1px solid var(--accent-orange-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.12em',
                background: 'var(--accent-orange)',
                color: '#ffffff',
                padding: '3px 8px',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              RULE ACTIVE
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
              {selectedRule.rule}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Showing {filteredViolations.length} {filteredViolations.length === 1 ? 'violation' : 'violations'}
            </span>
          </div>
          <button
            className="btn btn-secondary btn-sm cursor-target"
            onClick={() => setSelectedRule(null)}
            style={{ fontSize: 11, padding: '4px 10px' }}
          >
            Clear filter
          </button>
        </div>
      )}

      {/* ── Filter Toolbar ───────────────────────────────────────── */}
      <div className="card fade-in" style={{ marginBottom: 20, padding: '14px 18px' }}>
        <div className="guardrails-toolbar">
          {/* Search Box */}
          <div className="dep-search-wrap" style={{ minWidth: 260, flex: 1 }}>
            <IconSearch size={14} className="dep-search-icon" />
            <input
              className="dep-search-input"
              placeholder="Search rule name, file path, or remediation fix..."
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

          {/* Severity Filter Buttons */}
          <div className="dep-filter-buttons">
            <IconFilter size={13} style={{ color: 'var(--text-muted)', marginRight: 2 }} />
            {['all', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
              <button
                key={sev}
                className={`dep-filter-btn cursor-target ${severityFilter === sev ? 'active' : ''}`}
                onClick={() => setSeverityFilter(sev)}
              >
                {sev === 'all' ? 'All Severities' : sev}
              </button>
            ))}
          </div>

          {/* Status Filter Buttons */}
          <div className="dep-filter-buttons">
            {[
              { id: 'all', label: 'All Status' },
              { id: 'open', label: `Open (${openCount})` },
              { id: 'resolved', label: `Resolved (${resolvedCount})` },
              { id: 'ignored', label: `Ignored (${ignoredCount})` },
            ].map(({ id, label }) => (
              <button
                key={id}
                className={`dep-filter-btn cursor-target ${statusFilter === id ? 'active' : ''}`}
                onClick={() => setStatusFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Expand/Collapse Toggle */}
          <div className="view-toggle-btns" style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn btn-secondary btn-sm cursor-target"
              onClick={expandAll}
              title="Expand all violation cards"
              style={{ fontSize: 11, padding: '4px 8px' }}
            >
              Expand All
            </button>
            <button
              className="btn btn-secondary btn-sm cursor-target"
              onClick={collapseAll}
              title="Collapse all violation cards"
              style={{ fontSize: 11, padding: '4px 8px' }}
            >
              Collapse
            </button>
          </div>
        </div>
      </div>

      {/* ── Violations List ──────────────────────────────────────── */}
      {loading && !violations.length ? (
        <div className="loading-container">
          <div className="spinner" />
          <span>Auditing codebase for architectural guardrail violations…</span>
        </div>
      ) : filteredViolations.length > 0 ? (
        <div className="violations-container stagger-group">
          {filteredViolations.map((v, index) => {
            const isExpanded = expandedIds.has(v.id);
            const isUpdating = updatingId === v.id;
            const fullPath = v.line_number ? `${v.file_path}:${v.line_number}` : v.file_path;

            return (
              <div
                key={v.id}
                className={`card violation-card fade-in ${v.status !== 'open' ? 'violation-dimmed' : ''}`}
                style={{
                  borderLeft: `3px solid ${
                    v.severity === 'HIGH'
                      ? 'var(--accent-red)'
                      : v.severity === 'MEDIUM'
                      ? 'var(--accent-orange)'
                      : 'var(--border-secondary)'
                  }`,
                  marginBottom: 16,
                }}
              >
                {/* Violation Header */}
                <div
                  className="violation-card-header cursor-target"
                  onClick={() => toggleExpand(v.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="violation-header-left">
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        color: 'var(--text-muted)',
                        marginRight: 6,
                        letterSpacing: '0.05em',
                      }}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className={`badge badge-${v.severity.toLowerCase()}`}>
                      {v.severity}
                    </span>
                    <h3 className="violation-rule-title">{v.rule}</h3>
                    <span
                      className={`badge ${
                        v.status === 'open'
                          ? 'badge-info'
                          : v.status === 'resolved'
                          ? 'badge-low'
                          : 'badge-medium'
                      }`}
                      style={{ fontSize: 10, textTransform: 'uppercase' }}
                    >
                      {v.status}
                    </span>
                  </div>

                  <div className="violation-header-right">
                    <button
                      className="btn-icon-action"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(v.id);
                      }}
                      aria-label="Toggle details"
                    >
                      {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Location Chip Bar */}
                <div className="violation-location-bar">
                  <div className="violation-file-chip">
                    <IconFileCode size={14} className="location-icon" />
                    <span className="location-path">{fullPath}</span>
                    <button
                      className="btn-icon-action cursor-target"
                      onClick={() => handleCopyPath(v.file_path, v.line_number)}
                      title="Copy path to clipboard"
                    >
                      {copiedPath === fullPath ? (
                        <IconCheck size={13} style={{ color: 'var(--accent-green)' }} />
                      ) : (
                        <IconCopy size={13} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expandable Body */}
                {isExpanded && (
                  <div className="violation-body-content fade-in">
                    {/* Explanation */}
                    {v.explanation && (
                      <div className="violation-section">
                        <div className="violation-section-label">
                          <span>WHY THIS MATTERS / ARCHITECTURAL IMPACT</span>
                        </div>
                        <p className="violation-explanation-text">{v.explanation}</p>
                      </div>
                    )}

                    {/* Suggested Fix */}
                    {v.suggested_fix && (
                      <div className="violation-section">
                        <div className="violation-section-label fix-label">
                          <IconCheckCircle size={13} />
                          <span>ACTIONABLE REMEDIATION</span>
                        </div>
                        <div className="remediation-box">
                          <code>{v.suggested_fix}</code>
                        </div>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="violation-actions-row">
                      <div className="violation-status-meta">
                        <span>Created: {new Date(v.created_at).toLocaleDateString()}</span>
                        {v.status !== 'open' && (
                          <span className="status-note">
                            &bull; Currently flagged as <strong>{v.status}</strong>
                          </span>
                        )}
                      </div>

                      <div className="violation-buttons-group">
                        {v.status === 'open' ? (
                          <>
                            <button
                              className="btn btn-secondary btn-sm cursor-target"
                              onClick={() => handleStatusChange(v.id, 'ignored')}
                              disabled={isUpdating}
                            >
                              <span>Ignore Flag</span>
                            </button>
                            <button
                              className="btn btn-primary btn-sm cursor-target"
                              onClick={() => handleStatusChange(v.id, 'resolved')}
                              disabled={isUpdating}
                            >
                              <IconCheck size={14} />
                              <span>{isUpdating ? 'Updating...' : 'Mark Resolved'}</span>
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn btn-secondary btn-sm cursor-target"
                            onClick={() => handleStatusChange(v.id, 'open')}
                            disabled={isUpdating}
                          >
                            <span>Reopen Violation</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card empty-state fade-in" style={{ padding: '48px 24px' }}>
          <div className="empty-icon-wrap">
            <IconCheckCircle size={40} />
          </div>
          <h3 style={{ fontSize: 17, marginBottom: 6 }}>All Guardrail Policies Satisfied</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 460, margin: '0 auto' }}>
            {searchQuery || severityFilter !== 'all' || statusFilter !== 'all' || selectedRule
              ? 'No violations match your current search and filter criteria.'
              : 'Zero active architectural violations detected in the scanned codebase.'}
          </p>
          {(searchQuery || severityFilter !== 'all' || statusFilter !== 'all' || selectedRule) && (
            <button
              className="btn btn-secondary btn-sm cursor-target"
              style={{ marginTop: 14 }}
              onClick={() => {
                setSearchQuery('');
                setSeverityFilter('all');
                setStatusFilter('all');
                setSelectedRule(null);
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
