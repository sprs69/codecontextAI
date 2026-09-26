import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { onboardingApi } from '../services/api';
import { useToast } from '../components/Toast';
import {
  IconOnboarding,
  IconCheck,
  IconFileCode,
  IconHistory,
  IconSparkles,
  IconCopy,
  IconX,
  IconClock,
  IconChevronRight,
  IconPlay,
} from '../components/Icons';

const ROLES = [
  { id: 'backend', label: 'Backend Engineer', desc: 'FastAPI, SQLAlchemy, Celery, Domain Services' },
  { id: 'frontend', label: 'Frontend Engineer', desc: 'React, State Store, Component Topology' },
  { id: 'fullstack', label: 'Fullstack Engineer', desc: 'API endpoints, React UI, Database migrations' },
  { id: 'devops', label: 'DevOps / Platform', desc: 'Docker Compose, Redis, Alembic, CI/CD' },
  { id: 'qa', label: 'QA / Automation', desc: 'Pytest suite, Integration tests, Guardrails' },
  { id: 'data', label: 'Data / Storage', desc: 'PostgreSQL schemas, ORM models, Repositories' },
];

const LEVELS = [
  { id: 'junior', label: 'Junior', duration: '5 Days', desc: 'Foundational architecture & detailed step-by-step guidance' },
  { id: 'mid', label: 'Mid-Level', duration: '3 Days', desc: 'Balanced deep-dive into domain services & design patterns' },
  { id: 'senior', label: 'Senior / Staff', duration: '2 Days', desc: 'High-leverage architectural boundaries & guardrail policies' },
];

const PRESET_TECHS = ['Python', 'FastAPI', 'React', 'SQLAlchemy', 'PostgreSQL', 'Celery', 'Redis', 'Docker'];

export default function OnboardingPage({ activeRepo, onLoadDemo }) {
  const [role, setRole] = useState('backend');
  const [skillLevel, setSkillLevel] = useState('mid');
  const [selectedTechs, setSelectedTechs] = useState(['Python', 'FastAPI', 'React']);
  const [teamArea, setTeamArea] = useState('Checkout & Orders');
  const [plan, setPlan] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedPath, setCopiedPath] = useState(null);

  // Checkbox completion state per task (persisted by plan ID)
  const [completedTasks, setCompletedTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('codecontext_onboarding_tasks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const { showToast } = useToast();

  const loadHistory = useCallback(async () => {
    if (!activeRepo?.id) return;
    try {
      const data = await onboardingApi.getHistory(activeRepo.id);
      setHistory(data || []);
      // If we don't have an active plan yet, load the latest one from history
      if (!plan && data?.length) {
        setPlan(data[0]);
      }
    } catch {
      // non-blocking
    }
  }, [activeRepo, plan]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!activeRepo?.id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await onboardingApi.generate({
        repository_id: activeRepo.id,
        developer_role: role,
        skill_level: skillLevel,
        known_technologies: selectedTechs,
        team_area: teamArea || undefined,
      });
      setPlan(result);
      showToast(`Generated ${skillLevel} ${role} onboarding path!`, 'success');
      loadHistory();
    } catch (err) {
      setError(err.message);
      showToast(err.message || 'Failed to generate onboarding plan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleTech = (t) => {
    setSelectedTechs((prev) =>
      prev.includes(t) ? prev.filter((item) => item !== t) : [...prev, t]
    );
  };

  const toggleTask = (taskKey) => {
    setCompletedTasks((prev) => {
      const next = { ...prev, [taskKey]: !prev[taskKey] };
      try {
        localStorage.setItem('codecontext_onboarding_tasks', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(text);
    showToast('Copied to clipboard', 'info', 1600);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const handleSelectHistoryItem = (item) => {
    setPlan(item);
    setRole(item.developer_role || 'backend');
    setSkillLevel(item.skill_level || 'mid');
    setShowHistory(false);
    showToast('Loaded onboarding plan from history', 'info');
  };

  // Calculate task completion progress
  const totalTasks = useMemo(() => {
    if (!plan?.plan) return 0;
    return plan.plan.reduce((acc, day) => acc + (day.tasks?.length || 0), 0);
  }, [plan]);

  const completedCount = useMemo(() => {
    if (!plan?.plan) return 0;
    let count = 0;
    plan.plan.forEach((day, dayIdx) => {
      day.tasks?.forEach((_, taskIdx) => {
        const key = `${plan.id || 'default'}_d${dayIdx}_t${taskIdx}`;
        if (completedTasks[key]) count++;
      });
    });
    return count;
  }, [plan, completedTasks]);

  const progressPercentage = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  if (!activeRepo) {
    return (
      <div className="page-container">
        <div className="empty-state fade-in">
          <div className="empty-icon-wrap">
            <IconOnboarding size={36} />
          </div>
          <h3>No Repository Selected</h3>
          <p style={{ maxWidth: 480, margin: '0 auto 20px' }}>
            Load the ShopFlow demo or scan a local directory to generate contextual developer onboarding paths, task checklists, and architectural reading lists.
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
            <span className="project-badge">DEVELOPER ONBOARDING</span>
            <span className="branch-badge">guided ramp-up roadmap</span>
          </div>
          <h2 className="dashboard-repo-title">Contextual Developer Onboarding Journey</h2>
          <p className="dashboard-meta-text">
            Personalized codebase curriculum synthesized for <strong>{activeRepo.analysis_result?.project_name || activeRepo.name}</strong>.
            Accelerate time-to-first-PR with guided code readings and starter tasks.
          </p>
        </div>

        <div className="dashboard-header-actions">
          <button
            className="btn btn-secondary btn-sm cursor-target"
            onClick={() => setShowHistory(true)}
            title="View previously generated onboarding plans"
          >
            <IconHistory size={14} />
            <span>Saved Plans ({history.length})</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="card fade-in" style={{ borderColor: 'var(--accent-red)', marginBottom: 20 }}>
          <p style={{ color: 'var(--accent-red)', fontSize: 13 }}>{error}</p>
        </div>
      )}

      {/* ── Developer Profile Configuration Card ─────────────────── */}
      <div className="card fade-in" style={{ marginBottom: 28, padding: '22px 24px' }}>
        <div className="section-title-row" style={{ marginBottom: 18 }}>
          <div>
            <h3 className="card-title">Engineer Profile & Focus Area</h3>
            <p className="subheading-desc">Configure the new hire's target role, seniority level, and existing stack familiarity</p>
          </div>
          <button
            className="btn btn-primary btn-sm cursor-target"
            onClick={handleGenerate}
            disabled={loading}
          >
            <IconSparkles size={14} />
            <span>{loading ? 'Synthesizing Roadmap...' : 'Generate Personalized Path'}</span>
          </button>
        </div>

        {/* Role Selector Grid */}
        <div style={{ marginBottom: 18 }}>
          <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Target Engineering Role</label>
          <div className="onboarding-role-grid">
            {ROLES.map((r) => (
              <div
                key={r.id}
                className={`onboarding-role-card cursor-target ${role === r.id ? 'active' : ''}`}
                onClick={() => setRole(r.id)}
              >
                <div className="role-card-title">{r.label}</div>
                <div className="role-card-desc">{r.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Seniority Selector */}
        <div style={{ marginBottom: 18 }}>
          <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Seniority & Ramp-Up Target</label>
          <div className="grid-3">
            {LEVELS.map((lvl) => (
              <div
                key={lvl.id}
                className={`onboarding-role-card cursor-target ${skillLevel === lvl.id ? 'active' : ''}`}
                onClick={() => setSkillLevel(lvl.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span className="role-card-title">{lvl.label}</span>
                  <span className="micro-tag" style={{ color: 'var(--accent-indigo)' }}>{lvl.duration}</span>
                </div>
                <div className="role-card-desc">{lvl.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Known Tech & Team Focus */}
        <div className="grid-2">
          <div>
            <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Known Technologies Familiarity</label>
            <div className="onboarding-tech-chips">
              {PRESET_TECHS.map((tech) => (
                <button
                  key={tech}
                  type="button"
                  className={`tech-chip-btn cursor-target ${selectedTechs.includes(tech) ? 'selected' : ''}`}
                  onClick={() => toggleTech(tech)}
                >
                  {selectedTechs.includes(tech) && <IconCheck size={12} />}
                  <span>{tech}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Focus Area / Subsystem Target</label>
            <input
              className="input"
              placeholder="e.g. Checkout & Orders, Auth Service, Frontend Store"
              value={teamArea}
              onChange={(e) => setTeamArea(e.target.value)}
            />
            <p className="field-hint">Tailors file recommendations to specific domain submodules</p>
          </div>
        </div>
      </div>

      {/* ── Generated Onboarding Roadmap ─────────────────────────── */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
          <span>Synthesizing role-specific onboarding curriculum and file readings…</span>
        </div>
      ) : plan ? (
        <div className="onboarding-plan-view fade-in">
          {/* Progress Overview Card */}
          <div className="card onboarding-hero-banner" style={{ marginBottom: 24, padding: '20px 24px' }}>
            <div className="onboarding-banner-grid">
              <div>
                <div className="dashboard-tag-row">
                  <span className="project-badge" style={{ textTransform: 'uppercase' }}>
                    {plan.developer_role} CURRICULUM
                  </span>
                  <span className="branch-badge">
                    {plan.skill_level?.toUpperCase()} TRACK
                  </span>
                </div>
                <h3 className="onboarding-banner-title">
                  {plan.plan?.length || 3}-Day Architecture Onboarding Journey
                </h3>
                <p className="onboarding-banner-desc">
                  Check off orientation milestones as you read source files and complete guided starter exercises.
                </p>
              </div>

              <div className="onboarding-progress-box">
                <div className="progress-header-row">
                  <span className="progress-title">Onboarding Progress</span>
                  <span className="progress-percent">{progressPercentage}%</span>
                </div>
                <div className="health-bar" style={{ height: 8 }}>
                  <div
                    className="health-bar-fill good"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <div className="progress-stats-caption">
                  {completedCount} of {totalTasks} milestones completed
                </div>
              </div>
            </div>
          </div>

          {/* Minimal Monochrome Roadmap Bar (01 Context ── 02 Skills ── 03 Tasks ── 04 First PR) */}
          <div className="card fade-in" style={{ marginBottom: 24, padding: '20px 24px' }}>
            <div className="section-title-row" style={{ marginBottom: 16 }}>
              <div>
                <h3 className="card-title">Engineering Orientation Pipeline</h3>
                <p className="subheading-desc">Monochrome roadmap progression through codebase mastery</p>
              </div>
              <span className="micro-tag">
                Phase {progressPercentage >= 100 ? '4 of 4' : progressPercentage >= 75 ? '3 of 4' : progressPercentage >= 50 ? '2 of 4' : progressPercentage >= 25 ? '1 of 4' : '1 of 4'}
              </span>
            </div>

            <div className="mono-roadmap-bar stagger-group">
              {[
                { step: '01', title: 'Context', sub: 'Architecture & Boundaries', minPct: 25 },
                { step: '02', title: 'Skills', sub: 'Conventions & Patterns', minPct: 50 },
                { step: '03', title: 'Tasks', sub: 'Guided Starter Tasks', minPct: 75 },
                { step: '04', title: 'First PR', sub: 'Pre-Merge Gatekeeper', minPct: 100 },
              ].map((stage, idx, arr) => {
                const isCompleted = progressPercentage >= stage.minPct;
                const isCurrent = !isCompleted && (idx === 0 || progressPercentage >= arr[idx - 1].minPct);
                const isUpcoming = !isCompleted && !isCurrent;

                return (
                  <React.Fragment key={stage.step}>
                    <div className={`mono-roadmap-node ${isCompleted ? 'completed' : isCurrent ? 'current' : isUpcoming ? 'upcoming' : ''}`}>
                      <div className="mono-roadmap-num">{stage.step}</div>
                      <div className="mono-roadmap-label">{stage.title}</div>
                      <div className="mono-roadmap-sub">{stage.sub}</div>
                    </div>
                    {idx < arr.length - 1 && (
                      <div className={`mono-roadmap-connector ${isCompleted ? 'completed' : ''}`}>
                        <div className="connector-line" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Day-by-Day Interactive Roadmap */}
          <div className="card fade-in" style={{ marginBottom: 24, padding: '22px 24px' }}>
            <div className="section-title-row" style={{ marginBottom: 20 }}>
              <div>
                <h3 className="card-title">Day-by-Day Onboarding Roadmap</h3>
                <p className="subheading-desc">Structured progression from codebase orientation to your first PR</p>
              </div>
              <span className="micro-tag">{plan.plan?.length || 0} phases</span>
            </div>

            <div className="timeline-container stagger-group">
              {plan.plan?.map((day, dayIdx) => (
                <div key={dayIdx} className="timeline-day-block">
                  <div className="timeline-rail">
                    <div className="timeline-badge-circle">
                      <span>D{day.day}</span>
                    </div>
                    {dayIdx < plan.plan.length - 1 && <div className="timeline-line" />}
                  </div>

                  <div className="timeline-content-card">
                    <div className="timeline-header">
                      <div>
                        <h4 className="timeline-title">{day.title}</h4>
                        <p className="timeline-desc">{day.description}</p>
                      </div>
                      <div className="timeline-effort-pill">
                        <IconClock size={13} />
                        <span>~{day.estimated_hours}h estimated</span>
                      </div>
                    </div>

                    {/* Paths to Explore */}
                    {day.paths?.length > 0 && (
                      <div className="timeline-paths-section">
                        <span className="timeline-sublabel">RECOMMENDED MODULES TO INSPECT:</span>
                        <div className="timeline-paths-row">
                          {day.paths.map((p, pIdx) => (
                            <div key={pIdx} className="timeline-path-chip">
                              <IconFileCode size={13} style={{ color: 'var(--text-muted)' }} />
                              <span>{p}</span>
                              <button
                                className="btn-icon-action cursor-target"
                                onClick={() => handleCopy(p)}
                                title="Copy path"
                              >
                                {copiedPath === p ? (
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

                    {/* Interactive Tasks Checklist */}
                    {day.tasks?.length > 0 && (
                      <div className="timeline-tasks-section">
                        <span className="timeline-sublabel">OBJECTIVES & VERIFICATIONS:</span>
                        <div className="timeline-tasks-list">
                          {day.tasks.map((task, taskIdx) => {
                            const taskKey = `${plan.id || 'default'}_d${dayIdx}_t${taskIdx}`;
                            const isDone = !!completedTasks[taskKey];

                            return (
                              <div
                                key={taskIdx}
                                className={`timeline-task-item cursor-target ${isDone ? 'task-done' : ''}`}
                                onClick={() => toggleTask(taskKey)}
                              >
                                <input
                                  type="checkbox"
                                  checked={isDone}
                                  onChange={() => {}}
                                  className="timeline-task-checkbox"
                                />
                                <span className="timeline-task-text">{task}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Companion Lists: Recommended Files & Starter Tasks ── */}
          <div className="grid-2">
            {/* Recommended Files */}
            <div className="card fade-in">
              <div className="section-title-row" style={{ marginBottom: 14 }}>
                <h3 className="card-title">Curated File Reading List</h3>
                <span className="micro-tag">{plan.recommended_files?.length || 0} core files</span>
              </div>
              <p className="subheading-desc" style={{ marginBottom: 12 }}>
                High-leverage entry points and architecture definitions for {plan.developer_role}s
              </p>

              <div className="onboarding-files-list">
                {plan.recommended_files?.length > 0 ? (
                  plan.recommended_files.map((file, i) => (
                    <div key={i} className="code-file-item">
                      <div className="code-file-left">
                        <IconFileCode size={14} className="file-icon-svg" />
                        <span className="file-path-text">{file}</span>
                      </div>
                      <button
                        className="btn-icon-action cursor-target"
                        onClick={() => handleCopy(file)}
                        title="Copy file path"
                      >
                        {copiedPath === file ? (
                          <IconCheck size={12} style={{ color: 'var(--text-primary)' }} />
                        ) : (
                          <IconCopy size={12} />
                        )}
                      </button>
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No specific files generated.</p>
                )}
              </div>
            </div>

            {/* Starter Tasks / First PRs */}
            <div className="card fade-in">
              <div className="section-title-row" style={{ marginBottom: 14 }}>
                <h3 className="card-title">Starter PR Exercises</h3>
                <span className="micro-tag">First Contributions</span>
              </div>
              <p className="subheading-desc" style={{ marginBottom: 12 }}>
                Low-risk introductory tasks to gain confidence before taking on complex features
              </p>

              <div className="starter-tasks-list">
                {plan.starter_tasks?.length > 0 ? (
                  plan.starter_tasks.map((task, i) => (
                    <div key={i} className="starter-task-card">
                      <div className="starter-task-top">
                        <span className="starter-task-pill">Task 0{i + 1}</span>
                      </div>
                      <p className="starter-task-desc">{task}</p>
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No starter tasks generated.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card empty-state fade-in" style={{ padding: '48px 24px' }}>
          <div className="empty-icon-wrap">
            <IconOnboarding size={40} />
          </div>
          <h3 style={{ fontSize: 17, marginBottom: 6 }}>Ready to Generate Onboarding Curriculum</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 440, margin: '0 auto' }}>
            Select the new engineer's profile above and click <strong>Generate Personalized Path</strong> to synthesize a day-by-day roadmap.
          </p>
        </div>
      )}

      {/* ── History Modal ────────────────────────────────────────── */}
      {showHistory && (
        <div className="modal-backdrop fade-in" onClick={() => setShowHistory(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: 600 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <IconHistory size={18} style={{ color: 'var(--text-primary)' }} />
                <h3 className="tour-header-title">Saved Onboarding Curricula</h3>
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
                          <span className="badge badge-info" style={{ textTransform: 'uppercase' }}>
                            {item.developer_role}
                          </span>
                          <span className="badge badge-low">{item.skill_level}</span>
                          <strong style={{ fontSize: 13 }}>{item.team_area || 'General Track'}</strong>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {new Date(item.created_at).toLocaleString()} &bull;{' '}
                          {item.plan?.length || 0} days &bull;{' '}
                          {item.starter_tasks?.length || 0} starter tasks
                        </span>
                      </div>
                      <IconChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: 24 }}>
                  <IconHistory size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No historical plans saved yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
