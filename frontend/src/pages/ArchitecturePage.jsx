import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { architectureApi } from '../services/api';
import {
  IconArchitecture,
  IconCode,
  IconTerminal,
  IconLayers,
  IconServer,
  IconDatabase,
  IconCloud,
  IconX,
  IconCheck,
  IconCopy,
  IconPlus,
  IconFileCode,
  IconRefresh,
  IconFolder,
  IconPlay,
} from '../components/Icons';
import { useToast } from '../components/Toast';

const TIERS = [
  {
    id: 'presentation',
    name: 'Presentation & Client Tier',
    badgeClass: 'tier-frontend',
    types: ['frontend', 'ui', 'client', 'web'],
    flowLabel: 'HTTP / Client State Dispatches ↓',
    desc: 'User interface components, client routers, state store, and presentation logic',
  },
  {
    id: 'api',
    name: 'API Gateway & Routing Tier',
    badgeClass: 'tier-api',
    types: ['api', 'routes', 'endpoints'],
    flowLabel: 'Route Orchestration & Dependency Injection ↓',
    desc: 'REST API endpoints, route handlers, input validation schemas, and middlewares',
  },
  {
    id: 'domain',
    name: 'Domain Services & Async Workers Tier',
    badgeClass: 'tier-service',
    types: ['service', 'tasks', 'auth', 'middleware'],
    flowLabel: 'Domain Operations & Repository Invocations ↓',
    desc: 'Core business logic, domain services, background task workers, and token handlers',
  },
  {
    id: 'data-access',
    name: 'Data Access & Repository Tier',
    badgeClass: 'tier-backend',
    types: ['backend', 'repositories', 'repository', 'models', 'schemas'],
    flowLabel: 'ORM Queries & Relational Storage Operations ↓',
    desc: 'Data access abstraction, repository classes, ORM entity definitions, and schemas',
  },
  {
    id: 'infrastructure',
    name: 'Persistence & Infrastructure Tier',
    badgeClass: 'tier-database',
    types: ['database', 'migrations', 'external', 'utility'],
    flowLabel: 'Storage Engines, Distributed Caches & Third-Party APIs',
    desc: 'Primary database engines, cache brokers, external payment processors, and schema migrations',
  },
];

const COMPONENT_ICONS = {
  frontend: IconCode,
  api: IconTerminal,
  service: IconLayers,
  backend: IconServer,
  database: IconDatabase,
  external: IconCloud,
  utility: IconLayers,
};

/**
 * Resolves whether two components share a direct dependency relationship
 * using declared dependencies, name matching, and architectural type associations.
 */
function checkDependencyConnection(compA, compB) {
  if (!compA || !compB || compA.name === compB.name) return false;

  const matchesDep = (depString, target) => {
    if (!depString || !target) return false;
    const d = depString.toLowerCase().trim();
    const tName = (target.name || '').toLowerCase().trim();
    const tType = (target.type || '').toLowerCase().trim();

    // 1. Direct name match (exact or substring)
    if (tName === d || tName.includes(d) || d.includes(tName)) return true;

    // 2. Type-based match (e.g. "Database" matches database tier components, "External APIs" matches external)
    if (tType && (tType === d || d.includes(tType) || tType.includes(d))) return true;

    // 3. Significant token match (ignoring common noise words like layer, tier, service)
    const tokens = d.split(/\s+/).filter((w) => w.length > 2 && !['layer', 'tier', 'service', 'module', 'api', 'apis'].includes(w));
    if (tokens.some((token) => tName.includes(token) || tType.includes(token))) return true;

    return false;
  };

  const aDependsOnB = compA.dependencies?.some((dep) => matchesDep(dep, compB));
  const bDependsOnA = compB.dependencies?.some((dep) => matchesDep(dep, compA));

  return Boolean(aDependsOnB || bDependsOnA);
}

export default function ArchitecturePage({ activeRepo, onLoadDemo }) {
  const [components, setComponents] = useState([]);
  const [rules, setRules] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [selectedComp, setSelectedComp] = useState(null);
  const [hoveredComp, setHoveredComp] = useState(null);
  const [ruleFilter, setRuleFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedText, setCopiedText] = useState(null);
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [newRuleForm, setNewRuleForm] = useState({
    rule: '',
    description: '',
    severity: 'HIGH',
    category: 'Layered Architecture',
  });
  const { showToast } = useToast();

  const loadData = useCallback(async () => {
    if (!activeRepo?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [archData, rulesData] = await Promise.all([
        architectureApi.getComponents(activeRepo.id),
        architectureApi.getRules(activeRepo.id),
      ]);
      setComponents(archData.components || []);
      setPatterns(archData.patterns || []);
      setRules(rulesData || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeRepo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    showToast('Copied to clipboard', 'info', 1800);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleAddRule = async (e) => {
    e.preventDefault();
    if (!newRuleForm.rule.trim()) return;
    try {
      await architectureApi.createRule(activeRepo.id, newRuleForm);
      showToast('Architecture rule registered successfully!', 'success');
      setShowAddRuleModal(false);
      setNewRuleForm({ rule: '', description: '', severity: 'HIGH', category: 'Layered Architecture' });
      await loadData();
    } catch (err) {
      showToast(err.message || 'Failed to create rule', 'error');
    }
  };

  // Group components by tier
  const tierComponents = useMemo(() => {
    const map = {};
    TIERS.forEach((t) => { map[t.id] = []; });

    components.forEach((c) => {
      const type = (c.type || 'utility').toLowerCase();
      let matchedTier = TIERS.find((t) => t.types.includes(type));
      if (!matchedTier) matchedTier = TIERS[TIERS.length - 1]; // fallback infrastructure
      map[matchedTier.id].push(c);
    });

    return map;
  }, [components]);

  // Filter rules by severity
  const filteredRules = useMemo(() => {
    if (ruleFilter === 'all') return rules;
    return rules.filter((r) => (r.severity || '').toUpperCase() === ruleFilter.toUpperCase());
  }, [rules, ruleFilter]);

  // Matched patterns for selected component
  const selectedPatterns = useMemo(() => {
    if (!selectedComp) return [];
    return patterns.filter((p) => {
      const pFiles = p.files || [];
      const cFiles = selectedComp.files || [];
      const hasCommonFile = pFiles.some((f) => cFiles.includes(f));
      const mentionsComp = p.description?.toLowerCase().includes(selectedComp.name.toLowerCase());
      return hasCommonFile || mentionsComp;
    });
  }, [selectedComp, patterns]);

  // Matched rules for selected component
  const selectedRules = useMemo(() => {
    if (!selectedComp) return [];
    const type = (selectedComp.type || '').toLowerCase();
    return rules.filter((r) => {
      const rLower = (r.rule + ' ' + (r.description || '')).toLowerCase();
      if (type === 'api' && (rLower.includes('route') || rLower.includes('api') || rLower.includes('endpoint'))) return true;
      if (type === 'service' && (rLower.includes('service') || rLower.includes('logic'))) return true;
      if (type === 'backend' && (rLower.includes('database') || rLower.includes('repository'))) return true;
      if (rLower.includes('secret')) return true;
      return false;
    });
  }, [selectedComp, rules]);

  if (!activeRepo) {
    return (
      <div className="page-container">
        <div className="empty-state fade-in">
          <div className="empty-icon-wrap">
            <IconArchitecture size={36} />
          </div>
          <h3>No Repository Selected</h3>
          <p style={{ maxWidth: 480, margin: '0 auto 20px' }}>
            Load the ShopFlow demo or scan a local directory to visualize the multi-tier architecture topology, component nodes, and guardrails.
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
      {/* Page Header */}
      <div className="dashboard-topbar fade-in">
        <div>
          <div className="dashboard-tag-row">
            <span className="project-badge">SYSTEM ARCHITECTURE</span>
            <span className="branch-badge">{components.length} components detected</span>
          </div>
          <h2 className="dashboard-repo-title">
            Architecture Topology & Governance
          </h2>
          <p className="dashboard-meta-text">
            Interactive multi-tier codebase map for <strong>{activeRepo.analysis_result?.project_name || activeRepo.name}</strong>.
            Click any component node to inspect dependencies, source files, and rules.
          </p>
        </div>

        <div className="dashboard-header-actions">
          <button className="btn btn-secondary btn-sm cursor-target" onClick={loadData} disabled={loading} title="Refresh architecture data">
            <IconRefresh size={14} className={loading ? 'spin-icon' : ''} />
            <span>Reload Map</span>
          </button>
          <button className="btn btn-primary btn-sm cursor-target" onClick={() => setShowAddRuleModal(true)}>
            <IconPlus size={14} />
            <span>Add Rule</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="card fade-in" style={{ borderColor: 'var(--accent-red)', marginBottom: 20 }}>
          <p style={{ color: 'var(--accent-red)', fontSize: 13 }}>{error}</p>
        </div>
      )}

      {loading && !components.length ? (
        <div className="loading-container">
          <div className="spinner" />
          <span>Generating architecture topology map…</span>
        </div>
      ) : (
        <>
          {/* ── Interactive Topology Canvas ───────────────────────────── */}
          <div className="card fade-in" style={{ marginBottom: 28, padding: '20px 24px' }}>
            <div className="section-title-row" style={{ marginBottom: 16 }}>
              <div>
                <h3 className="subheading-title">Layered Component Topology</h3>
                <p className="subheading-desc">Structured tiers representing execution boundaries and data flows</p>
              </div>
              <span className="micro-tag">Click any node to inspect</span>
            </div>

            <div className="topology-canvas">
              {TIERS.map((tier, index) => {
                const nodes = tierComponents[tier.id] || [];
                if (!nodes.length) return null;

                return (
                  <React.Fragment key={tier.id}>
                    <div className="topology-tier reveal-up">
                      <div className="topology-tier-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className={`tier-badge ${tier.badgeClass}`}>{tier.name}</span>
                          <span className="tier-desc">{tier.desc}</span>
                        </div>
                        <span className="micro-tag">{nodes.length} {nodes.length === 1 ? 'node' : 'nodes'}</span>
                      </div>

                      <div className="topology-nodes-grid stagger-group">
                        {nodes.map((comp) => {
                          const IconComp = COMPONENT_ICONS[comp.type] || IconLayers;
                          const isSelected = selectedComp?.name === comp.name;
                          const isHovered = hoveredComp?.name === comp.name;

                          const isConnectedToHovered = Boolean(
                            hoveredComp && checkDependencyConnection(hoveredComp, comp)
                          );

                          const isConnectedToSelected = Boolean(
                            selectedComp && checkDependencyConnection(selectedComp, comp)
                          );

                          const isConnected = isConnectedToHovered || isConnectedToSelected;
                          const hasActiveFocus = Boolean(hoveredComp || selectedComp);
                          const isDimmed = Boolean(
                            hasActiveFocus &&
                            !isSelected &&
                            !isHovered &&
                            !isConnected
                          );

                          // Explicit inline visual styling to ensure contrast and unmistakable visibility
                          let cardStyle = {};
                          if (isHovered) {
                            cardStyle = {
                              borderColor: '#F97316',
                              backgroundColor: '#FFF7ED',
                              boxShadow: '0 0 0 2px #F97316, 0 8px 24px rgba(249, 115, 22, 0.15)',
                              transform: 'translateY(-2px) scale(1.01)',
                              opacity: 1,
                              zIndex: 10,
                              transition: 'all 0.18s ease-out',
                            };
                          } else if (isSelected) {
                            cardStyle = {
                              borderColor: '#F97316',
                              backgroundColor: '#FFF7ED',
                              boxShadow: '0 0 0 2px #FED7AA, 0 6px 18px rgba(24, 24, 27, 0.08)',
                              opacity: 1,
                              zIndex: 8,
                              transition: 'all 0.18s ease-out',
                            };
                          } else if (isConnected) {
                            cardStyle = {
                              borderColor: '#FED7AA',
                              backgroundColor: '#FFFFFF',
                              boxShadow: '0 0 0 1px #FED7AA, 0 4px 12px rgba(249, 115, 22, 0.06)',
                              transform: 'translateY(-1px)',
                              opacity: 1,
                              zIndex: 6,
                              transition: 'all 0.18s ease-out',
                            };
                          } else if (isDimmed) {
                            cardStyle = {
                              opacity: 0.4,
                              filter: 'grayscale(0.7)',
                              transform: 'scale(0.98)',
                              borderColor: '#E7E5E4',
                              transition: 'all 0.18s ease-out',
                            };
                          }

                          return (
                            <div
                              key={comp.name}
                              role="button"
                              tabIndex={0}
                              aria-label={`Inspect ${comp.name} architectural component`}
                              className={`topology-node-card cursor-target ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''} ${isConnected ? 'connected' : ''} ${isDimmed ? 'dimmed' : ''}`}
                              style={cardStyle}
                              onClick={() => setSelectedComp(comp)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setSelectedComp(comp);
                                }
                              }}
                              onMouseEnter={() => setHoveredComp(comp)}
                              onMouseLeave={() => setHoveredComp(null)}
                              onFocus={() => setHoveredComp(comp)}
                              onBlur={() => setHoveredComp(null)}
                            >
                              <div>
                                <div className="topology-node-top">
                                  <div className="topology-node-icon">
                                    <IconComp size={16} />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                      <div className="topology-node-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {comp.name}
                                      </div>
                                      {isHovered && (
                                        <span
                                          className="micro-tag"
                                          style={{
                                            color: '#EA580C',
                                            borderColor: '#FED7AA',
                                            background: '#FFF7ED',
                                            fontSize: '8px',
                                            padding: '1px 5px',
                                            fontWeight: 700,
                                            letterSpacing: '0.04em',
                                            flexShrink: 0,
                                          }}
                                        >
                                          FOCUS
                                        </span>
                                      )}
                                      {isConnectedToHovered && (
                                        <span
                                          className="micro-tag"
                                          style={{
                                            color: '#EA580C',
                                            borderColor: '#FED7AA',
                                            background: '#FFF7ED',
                                            fontSize: '8px',
                                            padding: '1px 5px',
                                            fontWeight: 600,
                                            letterSpacing: '0.04em',
                                            flexShrink: 0,
                                          }}
                                        >
                                          CONNECTED
                                        </span>
                                      )}
                                    </div>
                                    <span className="badge badge-info" style={{ fontSize: '9px', padding: '1px 5px' }}>
                                      {comp.type}
                                    </span>
                                  </div>
                                </div>
                                {comp.path && (
                                  <div className="topology-node-path" title={comp.path}>
                                    <IconFolder size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
                                    {comp.path}
                                  </div>
                                )}
                              </div>

                              <div className="topology-node-meta">
                                <span className="node-files-tag">{comp.files?.length || 0} files</span>
                                <span className="node-inspect-tag">Inspect →</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Flow connector between tiers */}
                    {index < TIERS.length - 1 && (
                      <div className="tier-flow-indicator">
                        <div className="flow-line" />
                        <span className="flow-label">{tier.flowLabel}</span>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* ── Slide-Over Detail Inspector Drawer ─────────────────────── */}
          {selectedComp && (
            <div className="inspector-overlay fade-in" onClick={() => setSelectedComp(null)}>
              <div
                className="inspector-drawer"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
              >
                <div className="inspector-header">
                  <div className="inspector-title-wrap">
                    <span className="inspector-type-badge">{selectedComp.type} COMPONENT</span>
                    <h3 className="inspector-title">{selectedComp.name}</h3>
                  </div>
                  <button
                    className="btn-icon-close cursor-target"
                    onClick={() => setSelectedComp(null)}
                    aria-label="Close inspector"
                  >
                    <IconX size={18} />
                  </button>
                </div>

                <div className="inspector-body">
                  {/* Path */}
                  {selectedComp.path && (
                    <div className="inspector-section">
                      <span className="inspector-label">Directory Path</span>
                      <div className="inspector-path-box">
                        <span>{selectedComp.path}</span>
                        <button
                          className="btn-icon-action cursor-target"
                          onClick={() => handleCopy(selectedComp.path)}
                          title="Copy path"
                        >
                          {copiedText === selectedComp.path ? (
                            <IconCheck size={14} style={{ color: 'var(--accent-green)' }} />
                          ) : (
                            <IconCopy size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {selectedComp.description && (
                    <div className="inspector-section">
                      <span className="inspector-label">Architectural Role</span>
                      <p className="inspector-desc-text">{selectedComp.description}</p>
                    </div>
                  )}

                  {/* Dependencies */}
                  <div className="inspector-section">
                    <span className="inspector-label">Outbound Dependencies</span>
                    <div className="inspector-dep-pills">
                      {selectedComp.dependencies?.length ? (
                        selectedComp.dependencies.map((dep, i) => (
                          <span key={i} className="inspector-dep-pill">
                            → {dep}
                          </span>
                        ))
                      ) : (
                        <span className="inspector-desc-text" style={{ fontStyle: 'italic', fontSize: '12px' }}>
                          No explicit outbound dependencies declared
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Linked Source Files */}
                  <div className="inspector-section">
                    <span className="inspector-label">Linked Source Files ({selectedComp.files?.length || 0})</span>
                    <div className="inspector-files-list">
                      {selectedComp.files?.map((f, i) => (
                        <div key={i} className="inspector-file-item">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                            <IconFileCode size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f}</span>
                          </div>
                          <button
                            className="btn-icon-action cursor-target"
                            onClick={() => handleCopy(f)}
                            title="Copy path"
                          >
                            {copiedText === f ? (
                              <IconCheck size={12} style={{ color: 'var(--text-primary)' }} />
                            ) : (
                              <IconCopy size={12} />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Associated Patterns */}
                  {selectedPatterns.length > 0 && (
                    <div className="inspector-section">
                      <span className="inspector-label">Associated Patterns</span>
                      {selectedPatterns.map((p, i) => (
                        <div key={i} className="inspector-pattern-box">
                          <div className="inspector-pattern-title">{p.name} ({Math.round(p.confidence * 100)}%)</div>
                          <div className="inspector-pattern-desc">{p.description}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Associated Rules */}
                  {selectedRules.length > 0 && (
                    <div className="inspector-section">
                      <span className="inspector-label">Governing Guardrail Rules</span>
                      {selectedRules.map((r, i) => (
                        <div key={i} className="inspector-rule-box">
                          <div className="inspector-rule-title">
                            <span className={`badge badge-${(r.severity || 'high').toLowerCase()}`} style={{ marginRight: 6, fontSize: '9px' }}>
                              {r.severity}
                            </span>
                            {r.rule}
                          </div>
                          {r.description && <div className="inspector-rule-desc">{r.description}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Detected Patterns Section ─────────────────────────────── */}
          <div className="card fade-in" style={{ marginBottom: 28 }}>
            <div className="section-title-row" style={{ marginBottom: 16 }}>
              <div>
                <h3 className="subheading-title">Detected Architecture Patterns</h3>
                <p className="subheading-desc">Structural paradigms identified by codebase scanner</p>
              </div>
              <span className="micro-tag">{patterns.length} patterns verified</span>
            </div>

            <div className="pattern-grid">
              {patterns.map((p, i) => (
                <div key={i} className="pattern-card">
                  <div className="pattern-top">
                    <span className="pattern-name">{p.name}</span>
                    <span className="pattern-conf-pill">{Math.round(p.confidence * 100)}% Confidence</span>
                  </div>
                  <p className="pattern-desc">{p.description}</p>
                  {p.files?.length > 0 && (
                    <div className="pattern-files-tag">
                      {p.files.slice(0, 2).map((f, fi) => (
                        <span key={fi} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 8 }}>
                          <IconFileCode size={11} />
                          <span>{f}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Architecture Rules Section ───────────────────────────── */}
          <div className="card fade-in">
            <div className="section-title-row" style={{ marginBottom: 16 }}>
              <div>
                <h3 className="subheading-title">Architectural Guardrail Rules</h3>
                <p className="subheading-desc">Active governance policies enforced across pull requests</p>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                {['all', 'HIGH', 'MEDIUM', 'LOW'].map((filter) => (
                  <button
                    key={filter}
                    className={`btn btn-sm cursor-target ${ruleFilter === filter ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setRuleFilter(filter)}
                  >
                    {filter === 'all' ? 'All Rules' : filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="rules-list">
              {filteredRules.length > 0 ? (
                filteredRules.map((r, i) => (
                  <div key={r.id || i} className="rule-card-item">
                    <div className="rule-header">
                      <span className={`badge badge-${(r.severity || 'medium').toLowerCase()}`}>
                        {r.severity}
                      </span>
                      <span className="rule-title">{r.rule}</span>
                      {r.category && (
                        <span className="micro-tag">{r.category}</span>
                      )}
                    </div>
                    {r.description && (
                      <p className="rule-desc">{r.description}</p>
                    )}
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: 12 }}>
                  No architecture rules matching filter.
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Add Custom Rule Modal ────────────────────────────────────── */}
      {showAddRuleModal && (
        <div className="modal-backdrop fade-in" onClick={() => setShowAddRuleModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: 540 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <h3 className="tour-header-title">Register Architecture Rule</h3>
              <button className="btn-icon-close cursor-target" onClick={() => setShowAddRuleModal(false)}>
                <IconX size={18} />
              </button>
            </div>
            <form onSubmit={handleAddRule} style={{ padding: '20px' }}>
              <div className="form-group">
                <label className="form-label">Rule Title / Constraint *</label>
                <input
                  className="input"
                  required
                  placeholder="e.g. Services must never import other services directly"
                  value={newRuleForm.rule}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, rule: e.target.value })}
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Severity Level</label>
                  <select
                    className="select"
                    value={newRuleForm.severity}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, severity: e.target.value })}
                  >
                    <option value="HIGH">High (Blocks Merges)</option>
                    <option value="MEDIUM">Medium (Requires Approval)</option>
                    <option value="LOW">Low (Advisory)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input
                    className="input"
                    placeholder="e.g. Modularity, Security"
                    value={newRuleForm.category}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, category: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description / Rationale</label>
                <textarea
                  className="textarea"
                  rows={3}
                  placeholder="Explain why this rule exists and how engineers should adhere to it"
                  value={newRuleForm.description}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm cursor-target"
                  onClick={() => setShowAddRuleModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm cursor-target">
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
