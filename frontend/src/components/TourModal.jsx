import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconSparkles,
  IconX,
  IconRepository,
  IconArchitecture,
  IconGuardrails,
  IconPRReview,
  IconDecisions,
  IconOnboarding,
  IconPlay,
  IconCheck,
  IconChevronRight,
  IconArrowRight,
} from './Icons';

const TOUR_STEPS = [
  {
    step: 1,
    title: 'Codebase Ingestion & Health Scan',
    route: '/repository',
    icon: IconRepository,
    badge: 'Step 1: Codebase Ingestion',
    problem: 'Distributed teams lack a single source of truth for architectural dependencies, frameworks, and codebase scale.',
    solution: 'CodeContext AI scans source files, extracts dependency graphs, and computes real-time repository health indexes.',
    description: 'Inspect the ShopFlow multi-tier stack (FastAPI, React, Celery, Stripe, SQLAlchemy) with automatic framework & dependency detection.',
    actionLabel: 'Explore Ingestion & Health',
  },
  {
    step: 2,
    title: 'Multi-Tier Topology & Pattern Discovery',
    route: '/architecture',
    icon: IconArchitecture,
    badge: 'Step 2: Architecture Topology',
    problem: 'Architectural diagrams are static, drift out of date, and live in disconnected wikis.',
    solution: 'Real-time multi-tier topology visualization mapping Presentation, API, Services, Repositories, and Persistence.',
    description: 'Explore the layered component tiers and 6 automatically detected design patterns with slide-over inspector drawers.',
    actionLabel: 'Inspect Architecture Topology',
  },
  {
    step: 3,
    title: 'Architectural Guardrails & Governance',
    route: '/guardrails',
    icon: IconGuardrails,
    badge: 'Step 3: Guardrail Governance',
    problem: 'Architectural violations—such as API routes bypassing service layers—accumulate silently until production failure.',
    solution: 'Active boundary enforcement flagging violations with severity scoring, line-numbered locations, and actionable fixes.',
    description: 'Audit critical architectural violations with line-numbered code remediation blueprints and resolution tracking.',
    actionLabel: 'Audit Guardrail Violations',
  },
  {
    step: 4,
    title: 'Predictive Pull Request Intelligence',
    route: '/pr-review',
    icon: IconPRReview,
    badge: 'Step 4: PR Gatekeeper',
    problem: 'Human code reviews miss subtle boundary breaches, leaked test credentials, and missing negative test cases.',
    solution: 'Automated pre-merge gatekeeper scoring diffs from 0-100, blocking risky PRs, and synthesizing reviewer questions.',
    description: 'Analyze the problematic checkout PR diff. Watch CodeContext AI flag CRITICAL risk, detect leaked keys, and suggest fixes.',
    actionLabel: 'Launch PR Risk Gatekeeper',
  },
  {
    step: 5,
    title: 'Institutional Decision Memory (ADRs)',
    route: '/decisions',
    icon: IconDecisions,
    badge: 'Step 5: Decision Memory',
    problem: 'Critical technical decisions made in Slack, PRs, and meetings are lost when engineers leave the company.',
    solution: 'Permanent ADR repository with AI extraction that turns raw discussions into structured architectural memory.',
    description: 'Query institutional memory to understand why architectural decisions were made, or extract structured ADRs from text.',
    actionLabel: 'Query Decision Memory',
  },
  {
    step: 6,
    title: 'Contextual Developer Onboarding Journey',
    route: '/onboarding',
    icon: IconOnboarding,
    badge: 'Step 6: Developer Onboarding',
    problem: 'New engineers spend weeks reading outdated wikis without knowing which core files matter for their specific role.',
    solution: 'AI-synthesized, day-by-day onboarding roadmaps with interactive checklists and safe starter contribution PRs.',
    description: 'Generate a personalized onboarding path with guided file readings and starter PR exercises for new engineers.',
    actionLabel: 'Generate Onboarding Roadmap',
  },
];

export function TourModal({ isOpen, onClose, activeRepo, onLoadDemo, loadingDemo }) {
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [viewMode, setViewMode] = useState('narrative'); // narrative | grid
  const navigate = useNavigate();

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[activeStepIdx];
  const StepIcon = currentStep.icon;

  const handleStepNavigate = (route) => {
    navigate(route);
    onClose();
  };

  const handleNext = () => {
    if (activeStepIdx < TOUR_STEPS.length - 1) {
      setActiveStepIdx(activeStepIdx + 1);
    }
  };

  const handlePrev = () => {
    if (activeStepIdx > 0) {
      setActiveStepIdx(activeStepIdx - 1);
    }
  };

  return (
    <div className="modal-backdrop fade-in" onClick={onClose}>
      <div
        className="modal-content tour-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: 860 }}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="tour-header-brand">
            <div className="tour-header-icon">
              <IconSparkles size={20} />
            </div>
            <div>
              <div className="tour-header-pill">IBM BOB 2.0 AI HACKATHON &bull; JUDGES DEMO</div>
              <h3 className="tour-header-title">CodeContext AI — End-to-End Product Story</h3>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="tour-mode-switch">
              <button
                className={`tour-switch-btn ${viewMode === 'narrative' ? 'active' : ''}`}
                onClick={() => setViewMode('narrative')}
              >
                Guided Narrative
              </button>
              <button
                className={`tour-switch-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                All 6 Pillars
              </button>
            </div>
            <button className="btn-icon-close" onClick={onClose} aria-label="Close modal">
              <IconX size={18} />
            </button>
          </div>
        </div>

        <div className="tour-modal-body">
          {/* Top Value Proposition Card */}
          <div className="tour-callout-card" style={{ marginBottom: 18 }}>
            <div className="tour-callout-content">
              <strong>Core Engineering Problem:</strong> Distributed engineering teams lose productivity because institutional context is fragmented across code, PRs, and siloed architecture decisions.
              <br />
              <strong>CodeContext AI Solution:</strong> A persistent intelligence brain connecting <strong>Codebase &rarr; Architecture &rarr; Guardrails &rarr; PR Risk &rarr; Team Memory &rarr; Onboarding</strong>.
            </div>
            {!activeRepo && (
              <div className="tour-callout-action">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={onLoadDemo}
                  disabled={loadingDemo}
                >
                  <IconPlay size={14} />
                  <span>{loadingDemo ? 'Loading ShopFlow Demo...' : 'Load ShopFlow Demo'}</span>
                </button>
              </div>
            )}
          </div>

          {/* ── Mode 1: Step-by-Step Guided Narrative ─────────────────── */}
          {viewMode === 'narrative' && (
            <div className="tour-narrative-view fade-in">
              {/* Step indicator progress bar */}
              <div className="tour-progress-bar-row">
                {TOUR_STEPS.map((s, idx) => (
                  <div
                    key={s.step}
                    className={`tour-step-indicator ${activeStepIdx === idx ? 'current' : activeStepIdx > idx ? 'completed' : ''}`}
                    onClick={() => setActiveStepIdx(idx)}
                    title={`Step ${s.step}: ${s.title}`}
                  >
                    <span className="step-dot" />
                    <span className="step-label">0{s.step}</span>
                  </div>
                ))}
              </div>

              {/* Active Step Feature Box */}
              <div className="tour-active-step-card card">
                <div className="tour-active-top">
                  <div className="tour-active-badge-wrap">
                    <span className="hero-pill-badge">{currentStep.badge}</span>
                    <h3 className="tour-active-title">{currentStep.title}</h3>
                  </div>
                  <div className="tour-active-icon-box">
                    <StepIcon size={24} />
                  </div>
                </div>

                <div className="tour-narrative-grid">
                  <div className="narrative-box problem-box">
                    <div className="narrative-box-title">THE ENGINEERING FRICTION</div>
                    <p>{currentStep.problem}</p>
                  </div>
                  <div className="narrative-box solution-box">
                    <div className="narrative-box-title">HOW CODECONTEXT AI SOLVES IT</div>
                    <p>{currentStep.solution}</p>
                  </div>
                </div>

                <p className="tour-active-desc">{currentStep.description}</p>

                <div className="tour-active-footer">
                  <div className="tour-nav-buttons">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handlePrev}
                      disabled={activeStepIdx === 0}
                    >
                      &larr; Previous Step
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleNext}
                      disabled={activeStepIdx === TOUR_STEPS.length - 1}
                    >
                      Next Step &rarr;
                    </button>
                  </div>

                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleStepNavigate(currentStep.route)}
                  >
                    <span>{currentStep.actionLabel}</span>
                    <IconArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Mode 2: All 6 Pillars Grid ───────────────────────────── */}
          {viewMode === 'grid' && (
            <div className="tour-steps-grid fade-in">
              {TOUR_STEPS.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.step} className="tour-step-card">
                    <div className="tour-step-top">
                      <span className="tour-step-badge">{s.badge}</span>
                      <div className="tour-step-icon-wrap">
                        <Icon size={18} />
                      </div>
                    </div>
                    <h4 className="tour-step-title">{s.title}</h4>
                    <p className="tour-step-desc">{s.description}</p>
                    <button
                      className="btn btn-secondary btn-sm tour-step-btn"
                      onClick={() => handleStepNavigate(s.route)}
                    >
                      <span>{s.actionLabel}</span>
                      <IconChevronRight size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer tour-modal-footer">
          <div className="tour-footer-status">
            {activeRepo ? (
              <span className="tour-status-active">
                <IconCheck size={14} /> Active Repository: <strong>{activeRepo.name}</strong>
              </span>
            ) : (
              <span className="tour-status-inactive">
                No repository active. Load the ShopFlow Demo above to inspect all live data.
              </span>
            )}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close Tour
          </button>
        </div>
      </div>
    </div>
  );
}

