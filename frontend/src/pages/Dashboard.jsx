import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { repositoryApi, healthApi, guardrailsApi, decisionsApi } from '../services/api';
import MoltenMetal from '../components/MoltenMetal';
import ScrollExpand from '../components/ScrollExpand';
import {
  IconShield,
  IconLayers,
  IconDecisions,
  IconPlay,
  IconArrowRight,
  IconCode,
  IconFolder,
  IconPRReview,
  IconOnboarding,
  IconRefresh,
  IconTerminal,
} from '../components/Icons';

const WORKFLOW_STEPS = [
  { step: 1, route: '/repository', icon: IconFolder, title: 'Repository Ingestion', desc: 'Scan code, languages & packages' },
  { step: 2, route: '/architecture', icon: IconCode, title: 'Context Extraction', desc: 'Identify frameworks & modules' },
  { step: 3, route: '/architecture', icon: IconLayers, title: 'Architecture Topology', desc: 'Map tiers & design patterns' },
  { step: 4, route: '/guardrails', icon: IconShield, title: 'Guardrail Detection', desc: 'Flag architectural violations' },
  { step: 5, route: '/decisions', icon: IconDecisions, title: 'Decision Memory', desc: 'Record & extract team ADRs' },
  { step: 6, route: '/pr-review', icon: IconPRReview, title: 'PR Intelligence', desc: 'Pre-merge risk score & test checks' },
  { step: 7, route: '/onboarding', icon: IconOnboarding, title: 'Developer Guidance', desc: 'Personalized onboarding paths' },
];

export default function Dashboard({ activeRepo, setActiveRepo }) {
  const [health, setHealth] = useState(null);
  const [guardrailSummary, setGuardrailSummary] = useState(null);
  const [decisionsCount, setDecisionsCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeWorkbenchTab, setActiveWorkbenchTab] = useState('pr_intercept'); // pr_intercept | architecture | decisions | telemetry
  const navigate = useNavigate();

  const analysis = activeRepo?.analysis_result;

  const loadDashboardData = useCallback(async () => {
    if (!activeRepo?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [h, g, d] = await Promise.all([
        healthApi.get(activeRepo.id),
        guardrailsApi.getSummary(activeRepo.id),
        decisionsApi.list(activeRepo.id),
      ]);
      setHealth(h);
      setGuardrailSummary(g);
      setDecisionsCount(d?.length || 0);
    } catch (e) {
      // If the backend returned 404/not found, re-sync repository list or load demo
      if (e.message?.toLowerCase().includes('not found') || e.message?.toLowerCase().includes('404')) {
        try {
          const list = await repositoryApi.list();
          if (list?.length > 0) {
            setActiveRepo(list[0]);
            return;
          } else {
            const demoRepo = await repositoryApi.loadDemo();
            setActiveRepo(demoRepo);
            return;
          }
        } catch {
          // fall through to setError
        }
      }
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeRepo, setActiveRepo]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  async function handleLoadDemo() {
    setDemoLoading(true);
    setError(null);
    try {
      const repo = await repositoryApi.loadDemo();
      setActiveRepo(repo);
    } catch (e) {
      setError(e.message);
    } finally {
      setDemoLoading(false);
    }
  }

  const overallHealth = health?.overall_score || analysis?.health_score || 87;
  const violationCount = guardrailSummary?.summary?.total || analysis?.potential_risks?.length || 5;
  const highViolations = guardrailSummary?.summary?.HIGH || 3;
  const patternCount = analysis?.detected_patterns?.length || 6;
  const filesCount = analysis?.total_files || 83;
  const locCount = analysis?.total_lines?.toLocaleString() || '12,847';
  const effectiveDecisions = decisionsCount || 4;

  return (
    <div className="page-container linear-dashboard-page">
      {/* ── 1. Linear Editorial Hero Section (Substantial & Preserved) ───────────────────────────── */}
      <section className="linear-hero-section molten-hero-card">
        {/* Subtle Vignette Scrim for Contrast & Text Readability */}
        <div className="molten-hero-scrim" aria-hidden="true" />

        {/* Foreground Content */}
        <div className="molten-hero-content">
          <div className="linear-kicker-row">
            <span className="linear-live-dot" />
            <span className="linear-kicker-text">
              CODECONTEXT AI &bull; INTELLIGENCE ENGINE &bull; IBM BOB 2.0
            </span>
          </div>

          <h1 className="linear-hero-headline molten-hero-headline">
            <span className="linear-hero-white">CODECONTEXT AI</span>
            <span className="linear-hero-dim">
              A new species of architecture intelligence. Purpose-built for modern engineering teams with AI workflows at its core, CodeContext sets a new standard for codebase understanding, pre-merge guardrails, and institutional memory.
            </span>
          </h1>

          {/* Three Core Architectural Pillars */}
          <div className="molten-pillars-row">
            <div className="molten-pillar-card">
              <div className="molten-pillar-icon">
                <IconCode size={16} />
              </div>
              <div className="molten-pillar-text">
                <span className="molten-pillar-lead">Understand your</span>
                <span className="molten-pillar-target">codebase.</span>
              </div>
            </div>

            <div className="molten-pillar-card">
              <div className="molten-pillar-icon">
                <IconLayers size={16} />
              </div>
              <div className="molten-pillar-text">
                <span className="molten-pillar-lead">Understand your</span>
                <span className="molten-pillar-target">architecture.</span>
              </div>
            </div>

            <div className="molten-pillar-card">
              <div className="molten-pillar-icon">
                <IconDecisions size={16} />
              </div>
              <div className="molten-pillar-text">
                <span className="molten-pillar-lead">Understand your</span>
                <span className="molten-pillar-target">engineering decisions.</span>
              </div>
            </div>
          </div>

          <div className="linear-hero-actions">
            {!activeRepo ? (
              <button
                className="btn btn-primary btn-lg cursor-target"
                onClick={handleLoadDemo}
                disabled={demoLoading}
                id="hero-load-demo-btn"
              >
                <IconPlay size={16} />
                <span>{demoLoading ? 'Ingesting Codebase…' : 'Load ShopFlow Platform Demo'}</span>
              </button>
            ) : (
              <button
                className="btn btn-primary btn-lg cursor-target"
                onClick={() => navigate('/pr-review')}
                id="hero-pr-review-btn"
              >
                <IconPRReview size={16} />
                <span>Review Pull Request</span>
              </button>
            )}

            <button
              className="btn btn-secondary btn-lg cursor-target"
              onClick={() => navigate('/architecture')}
              id="hero-explore-arch-btn"
            >
              <IconLayers size={16} />
              <span>Explore Architecture Topology</span>
            </button>

            <button
              className="btn btn-secondary btn-lg cursor-target"
              onClick={() => navigate('/guardrails')}
              id="hero-audit-guardrails-btn"
            >
              <IconShield size={16} />
              <span>Audit Guardrails ({violationCount})</span>
            </button>
          </div>
        </div>
      </section>

      {/* Executive Codebase Health & Intelligence Strip */}
      <section className="linear-stats-section">
        <div className="grid-6 stagger-group" style={{ marginTop: 12, marginBottom: 12 }}>
          {/* 1. CODEBASE HEALTH */}
          <div
            className="card stat-card fade-in cursor-target"
            onClick={() => navigate('/repository')}
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer', padding: '22px 20px', minHeight: 148, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div className="stat-card-header" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="card-title" style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '0.04em' }}>Codebase Health</span>
              <span className={`status-pill ${overallHealth >= 80 ? 'pill-good' : overallHealth >= 60 ? 'pill-warning' : 'pill-critical'}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                {overallHealth >= 80 ? 'HEALTHY' : 'REVIEW'}
              </span>
            </div>
            <div className="stat-card-body">
              <div className="card-value" style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.15 }}>
                {overallHealth}
                <span className="value-max" style={{ fontSize: 14 }}>/100</span>
              </div>
              <div className="card-subtitle" style={{ fontSize: 12.5, marginTop: 6 }}>{filesCount} files &bull; {locCount} LOC</div>
            </div>
          </div>

          {/* 2. GUARDRAIL VIOLATIONS */}
          <div
            className="card stat-card fade-in cursor-target"
            onClick={() => navigate('/guardrails')}
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer', padding: '22px 20px', minHeight: 148, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div className="stat-card-header" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="card-title" style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '0.04em' }}>Guardrail Violations</span>
              <span className="badge badge-high" style={{ fontSize: 10, padding: '2px 8px' }}>{highViolations} High</span>
            </div>
            <div className="stat-card-body">
              <div className="card-value" style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.15 }}>
                {violationCount}
                <span className="value-max" style={{ fontSize: 14 }}> active</span>
              </div>
              <div className="card-subtitle" style={{ fontSize: 12.5, marginTop: 6, display: 'flex', gap: 6 }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{guardrailSummary?.summary?.HIGH || 3} High</span>
                <span>&bull;</span>
                <span>{guardrailSummary?.summary?.MEDIUM || 2} Med</span>
                <span>&bull;</span>
                <span>{guardrailSummary?.summary?.LOW || 0} Low</span>
              </div>
            </div>
          </div>

          {/* 3. ARCHITECTURE COMPONENTS */}
          <div
            className="card stat-card fade-in cursor-target"
            onClick={() => navigate('/architecture')}
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer', padding: '22px 20px', minHeight: 148, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div className="stat-card-header" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="card-title" style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '0.04em' }}>Architecture</span>
              <span className="micro-tag" style={{ fontSize: 10, padding: '2px 8px' }}>5 TIERS</span>
            </div>
            <div className="stat-card-body">
              <div className="card-value" style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.15 }}>
                {analysis?.components?.length || 7}
                <span className="value-max" style={{ fontSize: 14 }}> nodes</span>
              </div>
              <div className="card-subtitle" style={{ fontSize: 12.5, marginTop: 6 }}>{patternCount} design patterns</div>
            </div>
          </div>

          {/* 4. PR RISK GATEKEEPER */}
          <div
            className="card stat-card fade-in cursor-target"
            onClick={() => navigate('/pr-review')}
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer', padding: '22px 20px', minHeight: 148, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div className="stat-card-header" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="card-title" style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '0.04em' }}>PR Risk Gatekeeper</span>
              <span className="badge badge-high" style={{ fontSize: 10, padding: '2px 8px' }}>CRITICAL</span>
            </div>
            <div className="stat-card-body">
              <div className="card-value" style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.15 }}>
                87
                <span className="value-max" style={{ fontSize: 14 }}>/100</span>
              </div>
              <div className="card-subtitle" style={{ fontSize: 12.5, marginTop: 6 }}>Pre-merge AST evaluation</div>
            </div>
          </div>

          {/* 5. TECHNICAL DECISIONS */}
          <div
            className="card stat-card fade-in cursor-target"
            onClick={() => navigate('/decisions')}
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer', padding: '22px 20px', minHeight: 148, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div className="stat-card-header" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="card-title" style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '0.04em' }}>Decision Memory</span>
              <span className="micro-tag" style={{ fontSize: 10, padding: '2px 8px' }}>ADR</span>
            </div>
            <div className="stat-card-body">
              <div className="card-value" style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.15 }}>
                {effectiveDecisions}
                <span className="value-max" style={{ fontSize: 14 }}> records</span>
              </div>
              <div className="card-subtitle" style={{ fontSize: 12.5, marginTop: 6 }}>Context reasoning graph</div>
            </div>
          </div>

          {/* 6. ONBOARDING STATUS */}
          <div
            className="card stat-card fade-in cursor-target"
            onClick={() => navigate('/onboarding')}
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer', padding: '22px 20px', minHeight: 148, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div className="stat-card-header" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="card-title" style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '0.04em' }}>Onboarding Status</span>
              <span className="status-pill pill-good" style={{ fontSize: 10, padding: '2px 8px' }}>READY</span>
            </div>
            <div className="stat-card-body">
              <div className="card-value" style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.15 }}>
                4 Paths
              </div>
              <div className="card-subtitle" style={{ fontSize: 12.5, marginTop: 6 }}>Role-tailored starter plans</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="linear-error-banner">
            <div className="error-banner-content">
              <span className="error-badge">BACKEND CONNECTION</span>
              <span className="error-message">{error}</span>
            </div>
            <div className="error-actions">
              <button
                className="btn btn-secondary btn-xs cursor-target"
                onClick={loadDashboardData}
                disabled={loading}
              >
                <IconRefresh size={12} className={loading ? 'spin-icon' : ''} />
                <span>Retry Sync</span>
              </button>
              <button
                className="btn btn-primary btn-xs cursor-target"
                onClick={handleLoadDemo}
                disabled={demoLoading}
              >
                <IconPlay size={12} />
                <span>{demoLoading ? 'Ingesting…' : 'Load ShopFlow Demo'}</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── 2. Cinematic Architecture ScrollExpand Section ───────────── */}
      <section className="linear-scrollexpand-section" aria-label="Architecture Topology Interactive Map">
        <ScrollExpand
          backgroundComponent={<div className="se-lens-viewport" />}
          title={
            <div className="se-title-pill-wrap">
              <span className="se-title-badge">
                <span className="se-live-dot" />
                <span>ARCHITECTURE VISUALIZATION</span>
              </span>
              <span className="se-title-text">Understand your codebase.</span>
            </div>
          }
          scrollHint={
            <span className="se-hint-badge">
              <span className="se-hint-text">Scroll to explore</span>
              <span className="se-hint-arrow" aria-hidden="true">↓</span>
            </span>
          }
          useWindowScroll
          stageHeight={660}
          startWidth={78}
          startHeight={72}
          startRadius={16}
          endRadius={14}
          mediaZoom={1.04}
          scrollDistance={0.65}
          holdDistance={0.25}
          smoothing={0.05}
          overlayScrim={0.50}
          className="codecontext-scrollexpand"
        >
          <div className="se-overlay-container">
            <div className="se-overlay-badge">
              <span className="se-live-dot" />
              <span className="se-badge-text">AUTONOMOUS ARCHITECTURE INTELLIGENCE</span>
            </div>

            <h2 className="se-overlay-headline">
              Engineering context, connected.
            </h2>

            <p className="se-overlay-subhead">
              Understand architecture, review pre-merge risk, preserve institutional decisions,
              and onboard developers with live AST intelligence from your codebase.
            </p>

            <div className="se-overlay-pills-row">
              <div className="se-pill-item">
                <span className="se-pill-label">TIERS MAPPED</span>
                <span className="se-pill-val">5 Architectural Layers</span>
              </div>
              <div className="se-pill-item">
                <span className="se-pill-label">GATEKEEPER</span>
                <span className="se-pill-val">Rule SEC-02 Intercept</span>
              </div>
              <div className="se-pill-item">
                <span className="se-pill-label">MEMORY</span>
                <span className="se-pill-val">ADR-003 Linked</span>
              </div>
              <div className="se-pill-item">
                <span className="se-pill-label">CODEBASE</span>
                <span className="se-pill-val">{filesCount} Files &bull; {locCount} LOC</span>
              </div>
            </div>

            <div className="se-overlay-actions">
              <button
                className="btn btn-primary btn-md cursor-target"
                onClick={() => navigate('/architecture')}
                id="se-explore-arch-btn"
              >
                <IconLayers size={15} />
                <span>Explore Architecture Topology</span>
              </button>
              <button
                className="btn btn-secondary btn-md cursor-target"
                onClick={() => navigate('/guardrails')}
                id="se-audit-guardrails-btn"
              >
                <IconShield size={15} />
                <span>Audit Guardrail Violations ({violationCount})</span>
              </button>
              <button
                className="btn btn-secondary btn-md cursor-target"
                onClick={() => navigate('/pr-review')}
                id="se-inspect-pr-btn"
              >
                <IconPRReview size={15} />
                <span>Inspect PR Intelligence</span>
              </button>
            </div>
          </div>
        </ScrollExpand>
      </section>

      {/* ── 3. The Hero Product Workbench (Screenshot 2 Inspiration) ─── */}
      <section className="linear-workbench-section">
        <div className="linear-workbench">
          {/* Workbench Window Chrome Bar */}
          <div className="workbench-topbar">
            <div className="workbench-window-controls">
              <span className="control-dot" />
              <span className="control-dot" />
              <span className="control-dot" />
            </div>

            <div className="workbench-context-pill">
              <span className="workbench-repo-name">
                {analysis?.project_name || 'ShopFlow eCommerce Platform'}
              </span>
              <span className="workbench-sep">/</span>
              <span className="workbench-branch-tag">main</span>
              <span className="workbench-commit-hash">commit 6f8d21b</span>
            </div>

            {/* Interactive Workbench Tabs */}
            <div className="workbench-tabs">
              <button
                className={`workbench-tab ${activeWorkbenchTab === 'pr_intercept' ? 'active' : ''} cursor-target`}
                onClick={() => setActiveWorkbenchTab('pr_intercept')}
              >
                <IconPRReview size={13} />
                <span>PR Intercept #142</span>
                <span className="workbench-tab-badge">HIGH</span>
              </button>

              <button
                className={`workbench-tab ${activeWorkbenchTab === 'architecture' ? 'active' : ''} cursor-target`}
                onClick={() => setActiveWorkbenchTab('architecture')}
              >
                <IconLayers size={13} />
                <span>Architecture Stream</span>
              </button>

              <button
                className={`workbench-tab ${activeWorkbenchTab === 'decisions' ? 'active' : ''} cursor-target`}
                onClick={() => setActiveWorkbenchTab('decisions')}
              >
                <IconDecisions size={13} />
                <span>Decision Memory</span>
              </button>

              <button
                className={`workbench-tab ${activeWorkbenchTab === 'telemetry' ? 'active' : ''} cursor-target`}
                onClick={() => setActiveWorkbenchTab('telemetry')}
              >
                <IconTerminal size={13} />
                <span>Diagnostics</span>
              </button>
            </div>

            <div className="workbench-actions-right">
              {!activeRepo ? (
                <button
                  className="btn btn-secondary btn-xs"
                  onClick={handleLoadDemo}
                  disabled={demoLoading}
                >
                  <IconPlay size={12} />
                  <span>{demoLoading ? 'Loading…' : 'Load Demo'}</span>
                </button>
              ) : (
                <button
                  className="btn btn-secondary btn-xs"
                  onClick={loadDashboardData}
                  disabled={loading}
                  title="Sync Stats"
                >
                  <IconRefresh size={12} className={loading ? 'spin-icon' : ''} />
                  <span>Sync</span>
                </button>
              )}
            </div>
          </div>

          {/* Workbench Body Canvas */}
          <div className="workbench-body">
            {/* Left / Center: Interactive Context Canvas */}
            <div className="workbench-main-canvas">
              {activeWorkbenchTab === 'pr_intercept' && (
                <div className="workbench-view-pr fade-in">
                  <div className="workbench-issue-header">
                    <div className="issue-tags">
                      <span className="issue-id">CC-142</span>
                      <span className="issue-severity-high">ARCHITECTURAL BOUNDARY VIOLATION</span>
                      <span className="issue-author">Opened by @alex-dev &bull; 2 min ago</span>
                    </div>
                    <h2 className="issue-title">
                      Direct ORM query inside Presentation Controller bypasses Domain Service Tier
                    </h2>
                    <div className="issue-code-pill">
                      <code>controllers/cart.py:48</code>
                      <span className="pill-divider">&bull;</span>
                      <span className="pill-code">SessionLocal().query(CartItem) violates rule SEC-02</span>
                    </div>
                  </div>

                  {/* Connected Activity Stream */}
                  <div className="workbench-timeline">
                    <div className="timeline-item">
                      <div className="timeline-node" />
                      <div className="timeline-content">
                        <span className="timeline-time">2m ago</span>
                        <p className="timeline-text">
                          <strong>CodeContext Gatekeeper</strong> intercepted commit <code>7b9a4c</code> on branch{' '}
                          <code>feature/cart-optimization</code>.
                        </p>
                      </div>
                    </div>

                    <div className="timeline-item">
                      <div className="timeline-node warning" />
                      <div className="timeline-content">
                        <span className="timeline-time">2m ago</span>
                        <p className="timeline-text">
                          <strong>Rule SEC-02: Layered Boundary Constraint</strong> triggered with{' '}
                          <span className="text-white">98% confidence</span>. Controllers must dispatch mutations via{' '}
                          <code>services/CartService.py</code> rather than querying the database engine directly.
                        </p>
                      </div>
                    </div>

                    <div className="timeline-item">
                      <div className="timeline-node" />
                      <div className="timeline-content">
                        <span className="timeline-time">1m ago</span>
                        <p className="timeline-text">
                          <strong>Decision Memory linked:</strong>{' '}
                          <span className="text-white">ADR-003 Decoupled Service Layer Architecture</span> (Accepted{' '}
                          <code>2024-03-12</code> by Core Architecture Guild).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeWorkbenchTab === 'architecture' && (
                <div className="workbench-view-arch fade-in">
                  <div className="arch-view-header">
                    <span className="arch-kicker">SYSTEM TOPOLOGY &bull; 5 TIERS</span>
                    <h2 className="arch-view-title">ShopFlow Microservice & Layer Topology</h2>
                    <p className="arch-view-desc">
                      Automated AST analysis identified 4 frameworks (FastAPI, React, Celery, SQLAlchemy) and{' '}
                      {filesCount} source files.
                    </p>
                  </div>

                  <div className="arch-tier-preview-grid">
                    <div className="arch-tier-block">
                      <span className="arch-tier-name">01 Presentation Tier</span>
                      <span className="arch-tier-sub">React 18 &bull; Client Routers</span>
                      <div className="arch-tier-files">
                        <code>cart_controller.js</code>
                        <code>checkout_view.jsx</code>
                      </div>
                    </div>

                    <div className="arch-tier-block">
                      <span className="arch-tier-name">02 API Routing Gateway</span>
                      <span className="arch-tier-sub">FastAPI &bull; OpenAPI v3</span>
                      <div className="arch-tier-files">
                        <code>api/v1/routes.py</code>
                        <code>dependencies.py</code>
                      </div>
                    </div>

                    <div className="arch-tier-block active-violation">
                      <span className="arch-tier-name">03 Domain Services</span>
                      <span className="arch-tier-sub">Celery &bull; Domain Rules</span>
                      <div className="arch-tier-files">
                        <code>CartService.py</code>
                        <code>PaymentWorker.py</code>
                      </div>
                    </div>

                    <div className="arch-tier-block">
                      <span className="arch-tier-name">04 Data Access Tier</span>
                      <span className="arch-tier-sub">SQLAlchemy &bull; Models</span>
                      <div className="arch-tier-files">
                        <code>models/cart.py</code>
                        <code>session.py</code>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeWorkbenchTab === 'decisions' && (
                <div className="workbench-view-decisions fade-in">
                  <div className="decisions-view-header">
                    <span className="decisions-kicker">INSTITUTIONAL KNOWLEDGE GRAPH</span>
                    <h2 className="decisions-view-title">Active Architecture Decision Records (ADRs)</h2>
                    <p className="decisions-view-desc">
                      Technical decisions parsed from repository RFCs and merged pull requests.
                    </p>
                  </div>

                  <div className="decisions-preview-list">
                    <div className="decision-preview-item">
                      <div className="decision-preview-header">
                        <span className="decision-id-tag">ADR-001</span>
                        <span className="decision-status-tag">ACCEPTED</span>
                        <span className="decision-title">FastAPI + Asyncpg as Primary API Stack</span>
                      </div>
                      <p className="decision-summary">
                        Replaced legacy Flask sync endpoints with FastAPI async handlers to handle 10x concurrent checkout sessions.
                      </p>
                    </div>

                    <div className="decision-preview-item">
                      <div className="decision-preview-header">
                        <span className="decision-id-tag">ADR-003</span>
                        <span className="decision-status-tag">ACCEPTED</span>
                        <span className="decision-title">Decoupled Domain Service Layer Architecture</span>
                      </div>
                      <p className="decision-summary">
                        Strict prohibition of raw DB transactions inside REST route controllers. All mutations must flow through domain services.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeWorkbenchTab === 'telemetry' && (
                <div className="workbench-view-telemetry fade-in">
                  <div className="telemetry-view-header">
                    <span className="telemetry-kicker">ENGINE TELEMETRY &bull; AST METRICS</span>
                    <h2 className="telemetry-view-title">Live Repository Health Diagnostics</h2>
                  </div>

                  <div className="telemetry-stats-row">
                    <div className="telemetry-stat-box">
                      <span className="stat-label">HEALTH INDEX</span>
                      <span className="stat-number">{overallHealth} / 100</span>
                      <span className="stat-status">STABLE BASELINE</span>
                    </div>

                    <div className="telemetry-stat-box">
                      <span className="stat-label">ANALYZED FILES</span>
                      <span className="stat-number">{filesCount}</span>
                      <span className="stat-status">PARSED IN 180MS</span>
                    </div>

                    <div className="telemetry-stat-box">
                      <span className="stat-label">LINES OF CODE</span>
                      <span className="stat-number">{locCount}</span>
                      <span className="stat-status">AST PARSED</span>
                    </div>

                    <div className="telemetry-stat-box">
                      <span className="stat-label">GUARDRAIL RULES</span>
                      <span className="stat-number">12 ACTIVE</span>
                      <span className="stat-status">{highViolations} HIGH SEVERITY</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Floating Guardian Agent Context Window (Linear Opus 5 style) */}
            <div className="workbench-floating-agent">
              <div className="agent-window-header">
                <div className="agent-identity">
                  <span className="agent-status-dot" />
                  <span className="agent-name">Guardian Agent v2.4</span>
                </div>
                <div className="agent-window-actions">
                  <span className="agent-tag">AST INTERCEPT</span>
                </div>
              </div>

              <div className="agent-window-body">
                <div className="agent-prompt-bubble">
                  <p>
                    "Intercept PR #142: Fix the direct database session query in <code>cart.py</code> and route via{' '}
                    <code>CartService.get_cart()</code> according to ADR-003."
                  </p>
                </div>

                <div className="agent-context-pills">
                  <span className="agent-pill">controllers/cart.py:48</span>
                  <span className="agent-pill">CartService.py</span>
                  <span className="agent-pill">ADR-003</span>
                </div>

                <div className="agent-telemetry-badge">
                  <span>Worked for 140ms</span>
                  <span className="telemetry-arrow">&bull;</span>
                  <span>AST check passed</span>
                </div>

                <div className="agent-diff-box">
                  <div className="diff-code-line del">
                    <span className="diff-sign">-</span>
                    <span>cart = db.query(CartItem).filter_by(id=cart_id).first()</span>
                  </div>
                  <div className="diff-code-line add">
                    <span className="diff-sign">+</span>
                    <span>cart = CartService.get_cart(cart_id, db_session)</span>
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-sm btn-agent-action cursor-target"
                  onClick={() => navigate('/pr-review')}
                >
                  <IconPRReview size={13} />
                  <span>Inspect in PR Intelligence</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Technical Monospace Metric Ribbon (Bottom) ──────────────── */}
      <section className="linear-ribbon-section">
        <div className="linear-metric-ribbon">
          <div
            className="ribbon-metric-col cursor-target"
            onClick={() => navigate('/architecture')}
            role="button"
            tabIndex={0}
          >
            <span className="ribbon-index">01</span>
            <span className="ribbon-label">HEALTH INDEX</span>
            <span className="ribbon-value">{overallHealth} / 100</span>
            <span className="ribbon-hint">STABLE &bull; VIEW TOPOLOGY &rarr;</span>
          </div>

          <div
            className="ribbon-metric-col cursor-target"
            onClick={() => navigate('/guardrails')}
            role="button"
            tabIndex={0}
          >
            <span className="ribbon-index">02</span>
            <span className="ribbon-label">GUARDRAILS</span>
            <span className="ribbon-value">{violationCount} DETECTED</span>
            <span className="ribbon-hint">{highViolations} HIGH &bull; AUDIT &rarr;</span>
          </div>

          <div
            className="ribbon-metric-col cursor-target"
            onClick={() => navigate('/architecture')}
            role="button"
            tabIndex={0}
          >
            <span className="ribbon-index">03</span>
            <span className="ribbon-label">PATTERNS</span>
            <span className="ribbon-value">{patternCount} IDENTIFIED</span>
            <span className="ribbon-hint">FASTAPI, CELERY &rarr;</span>
          </div>

          <div
            className="ribbon-metric-col cursor-target"
            onClick={() => navigate('/decisions')}
            role="button"
            tabIndex={0}
          >
            <span className="ribbon-index">04</span>
            <span className="ribbon-label">DECISIONS</span>
            <span className="ribbon-value">{effectiveDecisions} ACTIVE ADRs</span>
            <span className="ribbon-hint">ADR-001 &bull; ADR-003 &rarr;</span>
          </div>

          <div
            className="ribbon-metric-col cursor-target"
            onClick={() => navigate('/repository')}
            role="button"
            tabIndex={0}
          >
            <span className="ribbon-index">05</span>
            <span className="ribbon-label">CODEBASE</span>
            <span className="ribbon-value">{locCount} LOC</span>
            <span className="ribbon-hint">{filesCount} FILES &rarr;</span>
          </div>
        </div>
      </section>

      {/* ── 5. End-to-End AI Workflow Pipeline ─────────────────────────── */}
      <section className="linear-workflow-section">
        <div className="section-header-centered" style={{ marginBottom: 32 }}>
          <span className="section-category-tag">INTELLIGENCE PIPELINE</span>
          <h2 className="linear-section-title">Seven-Stage Codebase Intelligence Workflow</h2>
          <p className="linear-section-subtitle">
            Autonomous ingestion, architecture mapping, pre-merge guardrails, and role-based onboarding
          </p>
        </div>

        <div className="linear-workflow-grid">
          {WORKFLOW_STEPS.map((s) => {
            const StepIcon = s.icon;
            return (
              <div
                key={s.step}
                className="linear-workflow-card cursor-target"
                onClick={() => {
                  if (!activeRepo) {
                    handleLoadDemo().then(() => navigate(s.route));
                  } else {
                    navigate(s.route);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="workflow-card-top">
                  <span className="workflow-step-num">0{s.step}</span>
                  <div className="workflow-icon-box">
                    <StepIcon size={17} />
                  </div>
                </div>
                <h4 className="workflow-step-name">{s.title}</h4>
                <p className="workflow-step-desc">{s.desc}</p>
                <div className="workflow-card-footer">
                  <span>Explore Stage</span>
                  <IconArrowRight size={13} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
