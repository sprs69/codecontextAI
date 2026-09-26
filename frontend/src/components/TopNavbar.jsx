import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { API_BASE } from '../services/api';
import {
  IconDashboard,
  IconRepository,
  IconArchitecture,
  IconGuardrails,
  IconPRReview,
  IconDecisions,
  IconOnboarding,
  IconZap,
  IconChevronDown,
  IconChevronUp,
  IconSparkles,
  IconPlay,
  IconLayers,
  IconMenu,
  IconX,
  IconPanelCollapse,
  IconPanelExpand,
} from './Icons';
import './TopNavbar.css';
import { LiquidGlassSurface } from './LiquidGlassSurface';

export const NAV_ITEMS = [
  { to: '/dashboard', Icon: IconDashboard, label: 'Dashboard' },
  { to: '/repository', Icon: IconRepository, label: 'Repository' },
  { to: '/architecture', Icon: IconArchitecture, label: 'Architecture' },
  { to: '/guardrails', Icon: IconGuardrails, label: 'Guardrails' },
  { to: '/pr-review', Icon: IconPRReview, label: 'PR Intelligence' },
  { to: '/decisions', Icon: IconDecisions, label: 'Decisions' },
  { to: '/onboarding', Icon: IconOnboarding, label: 'Onboarding' },
];

export function TopNavbar({ activeRepo, onLoadDemo, loadingDemo, onOpenTour }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [apiOnline, setApiOnline] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  // Retractable horizontal navigation state (saved to localStorage)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('codecontext_nav_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('codecontext_nav_collapsed', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Scroll detection for navbar elevation
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close repo dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quick backend health ping
  useEffect(() => {
    fetch(`${API_BASE}/api/status`)
      .then((res) => {
        if (res.ok) setApiOnline(true);
      })
      .catch(() => setApiOnline(false));
  }, [location.pathname]);

  const analysis = activeRepo?.analysis_result;
  const healthScore = analysis?.health_score || 87;

  const getScoreColorClass = (score) => {
    if (score >= 70) return 'health-good';
    if (score >= 45) return 'health-warning';
    return 'health-critical';
  };

  return (
    <nav
      className={`top-navbar ${scrolled ? 'is-scrolled' : ''} ${isCollapsed ? 'nav-collapsed' : 'nav-expanded'}`}
      aria-label="Main Application Navigation"
    >
      {/* ── Original Liquid Glass JS Refractive Surface ────────────── */}
      <LiquidGlassSurface
        className="top-navbar-glass-surface"
        borderRadius={16}
        type="rounded"
        tintColor={[10 / 255, 7 / 255, 20 / 255]}
        tintOpacity={0.18}
      />

      <div className="top-navbar-inner">
        {/* ── Brand & Logo ────────────────────────────────────────── */}
        <div className="top-navbar-brand-section">
          <NavLink to="/dashboard" className="top-navbar-brand cursor-target" title="CodeContext AI Dashboard">
            <div className="top-brand-icon">
              <IconZap size={16} />
            </div>
            <div className="top-brand-text">
              <span className="top-brand-title">CodeContext</span>
              <span className="top-brand-suffix">AI</span>
            </div>
            <span className="top-brand-badge">BOB 2.0</span>
          </NavLink>

          {/* Repository Selector Dropdown */}
          <div className="repo-selector-container" ref={dropdownRef}>
            <button
              className={`repo-selector-btn ${activeRepo ? 'active' : 'unselected'} cursor-target`}
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-expanded={dropdownOpen}
              title="Switch repository or reload demo"
            >
              <div className="repo-btn-icon">
                <IconRepository size={14} />
              </div>
              <span className="repo-name">
                {activeRepo ? (analysis?.project_name || activeRepo.name) : 'Select Repo'}
              </span>
              <IconChevronDown size={12} className={`dropdown-chevron ${dropdownOpen ? 'open' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="repo-dropdown-menu fade-in">
                <div className="repo-dropdown-header">
                  <span className="dropdown-title">Active Repository</span>
                  <span className="dropdown-status-tag">
                    {activeRepo ? 'SYNCED' : 'NONE'}
                  </span>
                </div>

                {activeRepo ? (
                  <div className="repo-dropdown-body">
                    <div className="dropdown-repo-details">
                      <div className="detail-row">
                        <span className="detail-key">Files Analyzed:</span>
                        <span className="detail-val">{analysis?.total_files || 83}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-key">Lines of Code:</span>
                        <span className="detail-val">{analysis?.total_lines?.toLocaleString() || '12,847'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-key">Frameworks:</span>
                        <span className="detail-val">{analysis?.frameworks?.slice(0, 3).join(', ') || 'FastAPI, React'}</span>
                      </div>
                    </div>

                    <div className="dropdown-divider" />

                    <button
                      className="dropdown-action-item cursor-target"
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/repository');
                      }}
                    >
                      <IconLayers size={13} />
                      <span>Manage Repositories</span>
                    </button>

                    <button
                      className="dropdown-action-item cursor-target"
                      onClick={() => {
                        setDropdownOpen(false);
                        onLoadDemo();
                      }}
                      disabled={loadingDemo}
                    >
                      <IconPlay size={13} />
                      <span>{loadingDemo ? 'Reloading Demo...' : 'Reload ShopFlow Demo'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="repo-dropdown-body">
                    <p className="dropdown-empty-text">
                      Select or load a repository to generate architecture models and enable guardrails.
                    </p>
                    <button
                      className="btn btn-primary btn-sm dropdown-cta-btn cursor-target"
                      onClick={() => {
                        setDropdownOpen(false);
                        onLoadDemo();
                      }}
                      disabled={loadingDemo}
                    >
                      <IconPlay size={13} />
                      <span>{loadingDemo ? 'Loading Demo...' : 'Load ShopFlow Demo'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Retractable Horizontal Navigation Links ────────────── */}
        <div className="top-navbar-links-section" role="menubar">
          {NAV_ITEMS.map(({ to, Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `top-nav-link ${isActive ? 'active' : ''} cursor-target`
              }
              title={label}
              aria-label={label}
            >
              <span className="nav-link-icon">
                <Icon size={15} />
              </span>
              <span className="nav-link-label">{label}</span>
              <span className="nav-active-indicator" aria-hidden="true" />
            </NavLink>
          ))}

          {/* Collapse / Expand Toggle Button */}
          <button
            className="top-nav-toggle-btn cursor-target"
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expand navigation labels' : 'Retract navigation to compact mode'}
            aria-label={isCollapsed ? 'Expand navigation' : 'Retract navigation'}
          >
            {isCollapsed ? (
              <>
                <IconPanelExpand size={14} className="toggle-icon" />
                <span className="toggle-sr-text">Expand</span>
              </>
            ) : (
              <>
                <IconPanelCollapse size={14} className="toggle-icon" />
                <span className="toggle-label">Retract</span>
              </>
            )}
          </button>
        </div>

        {/* ── Right Utility Cluster ───────────────────────────────── */}
        <div className="top-navbar-right-section">
          {/* Architecture Health Pill */}
          {activeRepo && (
            <div
              className={`top-health-pill ${getScoreColorClass(healthScore)} cursor-target`}
              onClick={() => navigate('/dashboard')}
              title="Click to view detailed Health Dashboard"
            >
              <div className="health-dot" />
              <span className="health-label">Health:</span>
              <span className="health-score">{healthScore}/100</span>
            </div>
          )}

          {/* Backend Status indicator */}
          <div className="backend-status-pill" title={apiOnline ? 'FastAPI Backend Online' : 'FastAPI Backend Offline'}>
            <span className={`status-indicator-dot ${apiOnline ? 'online' : 'offline'}`} />
            <span className="backend-status-text">{apiOnline ? 'API 8000' : 'Offline'}</span>
          </div>

          {/* Hackathon Tour CTA */}
          <button
            className="btn btn-tour-trigger cursor-target"
            onClick={onOpenTour}
            title="Open interactive walkthrough for IBM Bob 2.0 Hackathon"
          >
            <IconSparkles size={13} className="tour-sparkle-icon" />
            <span>Tour</span>
          </button>

          {/* Quick Demo CTA if not loaded */}
          {!activeRepo && (
            <button
              className="btn btn-primary btn-sm cursor-target"
              onClick={onLoadDemo}
              disabled={loadingDemo}
            >
              <IconPlay size={13} />
              <span>{loadingDemo ? 'Loading...' : 'Demo'}</span>
            </button>
          )}

          {/* Mobile Menu Hamburger (< 992px) */}
          <button
            className="mobile-menu-toggle-btn cursor-target"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <IconX size={18} /> : <IconMenu size={18} />}
          </button>
        </div>
      </div>

      {/* ── Mobile Responsive Drawer (< 992px) ────────────────────── */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer fade-in">
          <div className="mobile-nav-items">
            {NAV_ITEMS.map(({ to, Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `mobile-nav-link ${isActive ? 'active' : ''} cursor-target`
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon size={16} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>

          <div className="mobile-drawer-footer">
            <button
              className="btn btn-primary btn-sm w-full cursor-target"
              onClick={() => {
                setMobileMenuOpen(false);
                onLoadDemo();
              }}
              disabled={loadingDemo}
            >
              <IconPlay size={14} />
              <span>{loadingDemo ? 'Reloading...' : 'Reload ShopFlow Demo'}</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

export default TopNavbar;
