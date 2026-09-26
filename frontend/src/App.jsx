import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import RepositoryPage from './pages/RepositoryPage';
import ArchitecturePage from './pages/ArchitecturePage';
import GuardrailsPage from './pages/GuardrailsPage';
import PRReviewPage from './pages/PRReviewPage';
import DecisionsPage from './pages/DecisionsPage';
import OnboardingPage from './pages/OnboardingPage';

import {
  IconDashboard,
  IconRepository,
  IconArchitecture,
  IconGuardrails,
  IconPRReview,
  IconDecisions,
  IconOnboarding,
  IconZap,
} from './components/Icons';
import { TopNavbar } from './components/TopNavbar';
import { TourModal } from './components/TourModal';
import { ToastProvider, useToast } from './components/Toast';
import { MonoLoader } from './components/MonoLoader';
import TargetCursor from './components/TargetCursor';
import MoltenMetal from './components/MoltenMetal';
import { useScrollReveal } from './hooks/useScrollReveal';
import { repositoryApi } from './services/api';
import './index.css';

const NAV_ITEMS = [
  { to: '/dashboard', Icon: IconDashboard, label: 'Dashboard' },
  { to: '/repository', Icon: IconRepository, label: 'Repository' },
  { to: '/architecture', Icon: IconArchitecture, label: 'Architecture' },
  { to: '/guardrails', Icon: IconGuardrails, label: 'Guardrails' },
  { to: '/pr-review', Icon: IconPRReview, label: 'PR Intelligence' },
  { to: '/decisions', Icon: IconDecisions, label: 'Decision Memory' },
  { to: '/onboarding', Icon: IconOnboarding, label: 'Onboarding' },
];

function AppContent() {
  const [activeRepo, setActiveRepo] = useState(() => {
    try {
      const saved = localStorage.getItem('codecontext_active_repo');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [tourOpen, setTourOpen] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [isWorkspaceRevealed, setIsWorkspaceRevealed] = useState(() => {
    try {
      return !!sessionStorage.getItem('codecontext_loader_shown');
    } catch {
      return true;
    }
  });

  const location = useLocation();
  const { showToast } = useToast();

  // Activate scroll-driven reveal system across routes
  useScrollReveal();

  useEffect(() => {
    if (activeRepo) {
      localStorage.setItem('codecontext_active_repo', JSON.stringify(activeRepo));
    }
  }, [activeRepo]);

  // Global demo loader handler
  const handleLoadDemo = useCallback(async () => {
    setLoadingDemo(true);
    try {
      const repo = await repositoryApi.loadDemo();
      setActiveRepo(repo);
      showToast('ShopFlow Platform demo loaded successfully!', 'success');
    } catch (e) {
      showToast(e.message || 'Failed to load demo repository', 'error');
    } finally {
      setLoadingDemo(false);
    }
  }, [showToast]);

  const handleWorkspaceReveal = useCallback(() => {
    setIsWorkspaceRevealed(true);
  }, []);

  return (
    <div className={`app-layout ${isWorkspaceRevealed ? 'workspace-ready' : 'workspace-entering'}`}>
      {/* ── Single Continuous Live Molten Metal Wallpaper (Fixed Viewport Layer) ── */}
      <div className="continuous-molten-wallpaper" aria-hidden="true">
        <MoltenMetal
          color1="#F97316"
          color2="#FED7AA"
          color3="#EA580C"
          speed={0.65}
          scale={5.2}
          detail={3}
          glow={1.4}
          coreSize={0.08}
          swirl={1.35}
          fold={-0.3}
          blackPoint={0.03}
          brightness={1.2}
          colorMode="molten"
          grain
          grainIntensity={0.03}
          mouseInteraction
          mouseStrength={0.25}
          opacity={0.72}
          backgroundColor="#FFFFFF"
          lightMode={true}
        />
        <div className="continuous-wallpaper-scrim" />
      </div>

      {/* ── Monochrome Intro Reveal & Precision TargetCursor ─────── */}
      <MonoLoader onWorkspaceReveal={handleWorkspaceReveal} />
      <TargetCursor
        spinDuration={2}
        hideDefaultCursor
        parallaxOn
        hoverDuration={0.2}
        cursorColor="#F97316"
        cursorColorOnTarget="#EA580C"
      />

      {/* ── Retractable Horizontal Top Navigation Bar ─────────────── */}
      <TopNavbar
        activeRepo={activeRepo}
        onLoadDemo={handleLoadDemo}
        loadingDemo={loadingDemo}
        onOpenTour={() => setTourOpen(true)}
      />

      {/* ── Main Content Area (Full Width Reclaimed) ──────────────── */}
      <div className="main-content">

        {/* Page Content Outlet with Smooth Blur-to-Sharp Page Transition */}
        <div key={location.pathname} className="page-transition-container">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={<Dashboard activeRepo={activeRepo} setActiveRepo={setActiveRepo} />}
            />
            <Route
              path="/repository"
              element={<RepositoryPage activeRepo={activeRepo} setActiveRepo={setActiveRepo} />}
            />
            <Route
              path="/architecture"
              element={<ArchitecturePage activeRepo={activeRepo} setActiveRepo={setActiveRepo} onLoadDemo={handleLoadDemo} />}
            />
            <Route
              path="/guardrails"
              element={<GuardrailsPage activeRepo={activeRepo} setActiveRepo={setActiveRepo} onLoadDemo={handleLoadDemo} />}
            />
            <Route
              path="/pr-review"
              element={<PRReviewPage activeRepo={activeRepo} setActiveRepo={setActiveRepo} onLoadDemo={handleLoadDemo} />}
            />
            <Route
              path="/decisions"
              element={<DecisionsPage activeRepo={activeRepo} setActiveRepo={setActiveRepo} onLoadDemo={handleLoadDemo} />}
            />
            <Route
              path="/onboarding"
              element={<OnboardingPage activeRepo={activeRepo} setActiveRepo={setActiveRepo} onLoadDemo={handleLoadDemo} />}
            />
          </Routes>
        </div>
      </div>

      {/* ── IBM Bob 2.0 Guided Hackathon Demo Tour Modal ───────────── */}
      <TourModal
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
        activeRepo={activeRepo}
        onLoadDemo={handleLoadDemo}
        loadingDemo={loadingDemo}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </BrowserRouter>
  );
}
