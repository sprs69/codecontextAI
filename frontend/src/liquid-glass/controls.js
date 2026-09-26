// Glass Controls System from liquid-glass-js
export const defaultGlassControls = {
  edgeIntensity: 0.01,
  rimIntensity: 0.04,
  baseIntensity: 0.008,
  edgeDistance: 0.15,
  rimDistance: 0.8,
  baseDistance: 0.1,
  cornerBoost: 0.02,
  rippleEffect: 0.08,
  blurRadius: 5.0,
  tintOpacity: 0.18,
  tintColor: [10.0 / 255.0, 7.0 / 255.0, 20.0 / 255.0],
  warp: false,
  hideButtons: false
};

if (typeof window !== 'undefined') {
  window.glassControls = window.glassControls || { ...defaultGlassControls };
}

export function updateAllGlassInstances(ContainerClass) {
  if (!ContainerClass || !ContainerClass.instances) return;
  ContainerClass.instances.forEach(instance => {
    if (instance.gl_refs && instance.gl_refs.gl) {
      const gl = instance.gl_refs.gl;
      if (instance.gl_refs.blurRadiusLoc) {
        gl.uniform1f(instance.gl_refs.blurRadiusLoc, window.glassControls.blurRadius);
      }
      if (instance.gl_refs.edgeIntensityLoc) {
        gl.uniform1f(instance.gl_refs.edgeIntensityLoc, window.glassControls.edgeIntensity);
      }
      if (instance.gl_refs.rimIntensityLoc) {
        gl.uniform1f(instance.gl_refs.rimIntensityLoc, window.glassControls.rimIntensity);
      }
      if (instance.gl_refs.baseIntensityLoc) {
        gl.uniform1f(instance.gl_refs.baseIntensityLoc, window.glassControls.baseIntensity);
      }
      if (instance.gl_refs.edgeDistanceLoc) {
        gl.uniform1f(instance.gl_refs.edgeDistanceLoc, window.glassControls.edgeDistance);
      }
      if (instance.gl_refs.rimDistanceLoc) {
        gl.uniform1f(instance.gl_refs.rimDistanceLoc, window.glassControls.rimDistance);
      }
      if (instance.gl_refs.baseDistanceLoc) {
        gl.uniform1f(instance.gl_refs.baseDistanceLoc, window.glassControls.baseDistance);
      }
      if (instance.gl_refs.cornerBoostLoc) {
        gl.uniform1f(instance.gl_refs.cornerBoostLoc, window.glassControls.cornerBoost);
      }
      if (instance.gl_refs.rippleEffectLoc) {
        gl.uniform1f(instance.gl_refs.rippleEffectLoc, window.glassControls.rippleEffect);
      }
      if (instance.gl_refs.warpLoc) {
        gl.uniform1f(instance.gl_refs.warpLoc, window.glassControls.warp ? 1.0 : 0.0);
      }
      if (instance.gl_refs.tintOpacityLoc) {
        gl.uniform1f(instance.gl_refs.tintOpacityLoc, window.glassControls.tintOpacity);
      }
      if (instance.render) {
        instance.render();
      }
    }
  });
}
