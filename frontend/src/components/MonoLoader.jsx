import React, { useState, useEffect } from 'react';

export function MonoLoader({ onWorkspaceReveal }) {
  const [visible, setVisible] = useState(() => {
    // Only show once per session unless query param ?demo=true or reset
    try {
      return !sessionStorage.getItem('codecontext_loader_shown');
    } catch {
      return true;
    }
  });

  const [stage, setStage] = useState('stage1'); // stage1 (black) -> stage2 (title) -> stage3 (tagline) -> stage4 (workspace blur-to-sharp)

  useEffect(() => {
    // If user prefers reduced motion, skip straight to workspace
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (onWorkspaceReveal) onWorkspaceReveal();
      setVisible(false);
      try {
        sessionStorage.setItem('codecontext_loader_shown', 'true');
      } catch {
        // ignore
      }
      return;
    }

    if (!visible) {
      if (onWorkspaceReveal) onWorkspaceReveal();
      return;
    }

    // High-precision Linear-style sequence timing (~1.6s total):
    // 0ms: Stage 1 - Near-black screen
    // 180ms: Stage 2 - CODECONTEXT title reveals via clip-path & letter-spacing interpolation
    // 650ms: Stage 3 - "Engineering context, without the context switching." reveals
    // 1200ms: Stage 4 - Workspace reveal triggers (blur 12px -> 0, scale 1.015 -> 1)
    // 1650ms: Loader fades out completely and unmounts

    const t1 = setTimeout(() => {
      setStage('stage2');
    }, 180);

    const t2 = setTimeout(() => {
      setStage('stage3');
    }, 650);

    const t3 = setTimeout(() => {
      setStage('stage4');
      if (onWorkspaceReveal) onWorkspaceReveal();
    }, 1200);

    const t4 = setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem('codecontext_loader_shown', 'true');
      } catch {
        // ignore
      }
    }, 1700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [visible, onWorkspaceReveal]);

  if (!visible) return null;

  const handleSkip = () => {
    setStage('stage4');
    if (onWorkspaceReveal) onWorkspaceReveal();
    setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem('codecontext_loader_shown', 'true');
      } catch {
        // ignore
      }
    }, 250);
  };

  return (
    <div
      className={`mono-loader-overlay ${stage === 'stage4' ? 'loader-exiting' : ''}`}
      onClick={handleSkip}
      title="Click anywhere to skip intro"
    >
      <div className="mono-loader-container">
        {/* Stage 2: Large white CODECONTEXT with mask/clip-path reveal */}
        <div className={`mono-loader-brand ${stage !== 'stage1' ? 'is-revealed' : ''}`}>
          <span className="mono-loader-word">
            {'CODECONTEXT'.split('').map((char, i) => (
              <span
                key={i}
                className="mono-char"
                style={{ animationDelay: `${180 + i * 35}ms` }}
              >
                {char}
              </span>
            ))}
          </span>
        </div>

        {/* Stage 3: Editorial Subtitle Statement */}
        <div className={`mono-loader-tagline ${stage === 'stage3' || stage === 'stage4' ? 'is-revealed' : ''}`}>
          <span>Engineering context, without the context switching.</span>
        </div>
      </div>

      <div className="mono-loader-skip-hint">PRESS ANYWHERE TO SKIP</div>
    </div>
  );
}
