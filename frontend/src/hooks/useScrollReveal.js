import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * CodeContext AI — Global Scroll & Stagger Reveal System
 * Uses IntersectionObserver to trigger performant, GPU-accelerated
 * blur -> sharp and translate entrance transitions on viewport entry.
 */
export function useScrollReveal() {
  const location = useLocation();

  useEffect(() => {
    // Respect user's reduced-motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('.reveal, .reveal-up, .reveal-scale, .reveal-blur, .stagger-group').forEach((el) => {
        el.classList.add('is-revealed');
      });
      return;
    }

    const observerCallback = (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          // Once revealed, unobserve to free resources
          observer.unobserve(entry.target);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.08,
    });

    // Auto-discover and observe all revealable elements
    const elements = document.querySelectorAll(
      '.reveal, .reveal-up, .reveal-scale, .reveal-blur, .stagger-group, .card, .stat-card, .topology-tier, .violation-card, .decision-card, .timeline-day-block'
    );

    elements.forEach((el) => {
      // Check if already in viewport immediately
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('is-revealed');
      } else {
        observer.observe(el);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [location.pathname]);
}
