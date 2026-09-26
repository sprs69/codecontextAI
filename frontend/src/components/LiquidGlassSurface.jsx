import React, { useEffect, useRef } from 'react';
import Container from '../liquid-glass/container.js';
import '../liquid-glass/glass.css';

/**
 * LiquidGlassSurface — React Adapter for original Liquid Glass JS library
 * Source: https://github.com/dashersw/liquid-glass-js.git
 *
 * Responsibilities:
 * - Initializes single vanilla Liquid Glass Container instance on mount
 * - Attaches WebGL rendering canvas cleanly behind content
 * - Automatically resizes viewport uniforms on container resize
 * - Fully cleans up WebGL context, event listeners, and DOM on unmount
 * - Preserves React children and click handlers (zero pointer-events blocking)
 */
export function LiquidGlassSurface({
  children,
  className = '',
  style = {},
  borderRadius = 16,
  type = 'rounded', // 'rounded' | 'circle' | 'pill'
  tintColor = [10.0 / 255.0, 7.0 / 255.0, 20.0 / 255.0],
  tintOpacity = 0.18,
  warp = false,
  as: Component = 'div',
  ...restProps
}) {
  const rootRef = useRef(null);
  const instanceRef = useRef(null);
  const resizeObserverRef = useRef(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    // Respect prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Create the original Liquid Glass JS Container instance
    const instance = new Container({
      element: el,
      borderRadius,
      type,
      tintColor,
      tintOpacity: prefersReducedMotion ? 0.12 : tintOpacity,
      warp: prefersReducedMotion ? false : warp,
    });
    instanceRef.current = instance;

    // Handle dynamic element sizing without duplicate WebGL contexts
    let resizeTimer = null;
    if (typeof window !== 'undefined' && window.ResizeObserver) {
      const ro = new ResizeObserver(() => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (instanceRef.current) {
            instanceRef.current.updateSizeFromDOM();
          }
        }, 16);
      });
      ro.observe(el);
      resizeObserverRef.current = ro;
    }

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
      }
    };
  }, [borderRadius, type, tintOpacity, warp]);

  return (
    <Component
      ref={rootRef}
      className={`liquid-glass-surface ${className}`.trim()}
      style={style}
      {...restProps}
    >
      {children ? (
        <div className="liquid-glass-content">{children}</div>
      ) : null}
    </Component>
  );
}

export default LiquidGlassSurface;
