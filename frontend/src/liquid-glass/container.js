import html2canvas from 'html2canvas';
import './controls.js';

export class Container {
  static instances = [];
  static pageSnapshot = null;
  static isCapturing = false;
  static waitingForSnapshot = [];

  constructor(options = {}) {
    this.options = options;
    this.width = 0; // Will be set from DOM
    this.height = 0; // Will be set from DOM
    this.borderRadius = options.borderRadius !== undefined ? options.borderRadius : 48;
    this.type = options.type || 'rounded'; // "rounded", "circle", or "pill"
    // Dark violet/black glass tint (#0A0714: rgba(10, 7, 20, 0.18))
    this.tintColor = options.tintColor || [10.0 / 255.0, 7.0 / 255.0, 20.0 / 255.0];
    this.tintOpacity = options.tintOpacity !== undefined ? options.tintOpacity : 0.18;
    this.warp = options.warp !== undefined ? options.warp : false;

    this.canvas = null;
    this.element = null;
    this.gl = null;
    this.gl_refs = {};
    this.webglInitialized = false;
    this.children = []; // Child buttons/components

    this._handleScroll = null;
    this._rafSizeId = null;

    // Add to instances
    Container.instances.push(this);

    // Initialize
    this.init();
  }

  addChild(child) {
    this.children.push(child);
    child.parent = this;

    // Add child's element to container
    if (child.element && this.element) {
      this.element.appendChild(child.element);
    }

    // If child is a button, set up nested glass
    if (child.setupAsNestedGlass) {
      child.setupAsNestedGlass();
    }

    // Update container size based on actual DOM size
    this.updateSizeFromDOM();

    return child;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index > -1) {
      this.children.splice(index, 1);
      child.parent = null;

      if (child.element && this.element.contains(child.element)) {
        this.element.removeChild(child.element);
      }

      // Update container size after removing child
      this.updateSizeFromDOM();
    }
  }

  updateSizeFromDOM() {
    if (this._rafSizeId) {
      cancelAnimationFrame(this._rafSizeId);
    }
    // Wait for next frame to ensure DOM layout is complete
    this._rafSizeId = requestAnimationFrame(() => {
      if (!this.element || !this.canvas) return;
      const rect = this.element.getBoundingClientRect();
      let newWidth = Math.ceil(rect.width);
      let newHeight = Math.ceil(rect.height);

      if (newWidth <= 0 || newHeight <= 0) return;

      // Apply type-specific sizing logic
      if (this.type === 'circle') {
        const size = Math.max(newWidth, newHeight);
        newWidth = size;
        newHeight = size;
        this.borderRadius = size / 2;

        this.element.style.width = size + 'px';
        this.element.style.height = size + 'px';
        this.element.style.borderRadius = this.borderRadius + 'px';
      } else if (this.type === 'pill') {
        this.borderRadius = newHeight / 2;
        this.element.style.borderRadius = this.borderRadius + 'px';
      }

      if (newWidth !== this.width || newHeight !== this.height) {
        this.width = newWidth;
        this.height = newHeight;

        // Update canvas size to match actual DOM size
        this.canvas.width = newWidth;
        this.canvas.height = newHeight;
        this.canvas.style.width = newWidth + 'px';
        this.canvas.style.height = newHeight + 'px';
        if (this.borderRadius) {
          this.canvas.style.borderRadius = this.borderRadius + 'px';
        }

        // Update WebGL viewport if initialized
        if (this.gl_refs && this.gl_refs.gl) {
          this.gl_refs.gl.viewport(0, 0, newWidth, newHeight);
          if (this.gl_refs.resolutionLoc) {
            this.gl_refs.gl.uniform2f(this.gl_refs.resolutionLoc, newWidth, newHeight);
          }
          if (this.gl_refs.borderRadiusLoc) {
            this.gl_refs.gl.uniform1f(this.gl_refs.borderRadiusLoc, this.borderRadius);
          }
        }

        // Update any nested glass children when container size changes
        this.children.forEach(child => {
          if (child && child.isNestedGlass && child.gl_refs && child.gl_refs.gl) {
            const gl = child.gl_refs.gl;
            gl.bindTexture(gl.TEXTURE_2D, child.gl_refs.texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, newWidth, newHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

            if (child.gl_refs.textureSizeLoc) {
              gl.uniform2f(child.gl_refs.textureSizeLoc, newWidth, newHeight);
            }
            if (child.gl_refs.containerSizeLoc) {
              gl.uniform2f(child.gl_refs.containerSizeLoc, newWidth, newHeight);
            }
          }
        });

        // Re-render
        if (this.render) {
          this.render();
        }
      }
    });
  }

  init() {
    this.createElement(this.options.element);
    this.setupCanvas();

    // Get initial size from DOM
    this.updateSizeFromDOM();

    // Handle page snapshot
    if (Container.pageSnapshot) {
      // Snapshot already exists, initialize immediately
      this.initWebGL();
    } else if (Container.isCapturing) {
      // Snapshot in progress, add to waiting queue
      Container.waitingForSnapshot.push(this);
    } else {
      // Start snapshot process
      Container.isCapturing = true;
      Container.waitingForSnapshot.push(this);
      this.capturePageSnapshot();
    }
  }

  createElement(existingElement) {
    if (existingElement) {
      this.element = existingElement;
    } else {
      this.element = document.createElement('div');
    }
    this.element.classList.add('glass-container');

    // Add type-specific classes
    if (this.type === 'circle') {
      this.element.classList.add('glass-container-circle');
    } else if (this.type === 'pill') {
      this.element.classList.add('glass-container-pill');
    }

    if (this.borderRadius) {
      this.element.style.borderRadius = this.borderRadius + 'px';
    }

    // Create canvas (will be sized after DOM layout)
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'liquid-glass-canvas';
    if (this.borderRadius) {
      this.canvas.style.borderRadius = this.borderRadius + 'px';
    }
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.25)';
    this.canvas.style.pointerEvents = 'none'; // Critical: ensure WebGL layer NEVER blocks clicks
    this.canvas.style.zIndex = '0';

    if (this.element.firstChild) {
      this.element.insertBefore(this.canvas, this.element.firstChild);
    } else {
      this.element.appendChild(this.canvas);
    }
  }

  setupCanvas() {
    this.gl = this.canvas.getContext('webgl', {
      preserveDrawingBuffer: true,
      alpha: true,
      premultipliedAlpha: false
    });
    if (!this.gl) {
      console.warn('Liquid Glass: WebGL not supported on this device');
      return;
    }
  }

  getPosition() {
    if (!this.canvas) return { x: 0, y: 0 };
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }

  capturePageSnapshot() {
    if (typeof window === 'undefined') return;

    // Wait one microtask/tick to ensure initial paint is underway
    setTimeout(() => {
      const h2c = window.html2canvas || html2canvas;
      if (!h2c) {
        console.warn('html2canvas unavailable for Liquid Glass snapshot');
        Container.isCapturing = false;
        Container.waitingForSnapshot = [];
        return;
      }

      h2c(document.body, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        ignoreElements: function (element) {
          return (
            element.classList.contains('glass-container') ||
            element.classList.contains('glass-button') ||
            element.classList.contains('glass-button-text') ||
            element.classList.contains('liquid-glass-surface') ||
            element.classList.contains('liquid-glass-canvas') ||
            element.classList.contains('top-navbar') ||
            element.classList.contains('tour-modal-overlay')
          );
        }
      })
        .then(snapshot => {
          Container.pageSnapshot = snapshot;
          Container.isCapturing = false;

          const waitingContainers = Container.waitingForSnapshot.slice();
          Container.waitingForSnapshot = [];

          waitingContainers.forEach(container => {
            if (!container.webglInitialized) {
              container.initWebGL();
            }
          });
        })
        .catch(error => {
          console.warn('Liquid Glass html2canvas capture error:', error);
          Container.isCapturing = false;
          Container.waitingForSnapshot = [];
        });
    }, 50);
  }

  initWebGL() {
    if (!Container.pageSnapshot || !this.gl) return;

    if (Container.pageSnapshot instanceof HTMLCanvasElement) {
      this.setupShader(Container.pageSnapshot);
      this.webglInitialized = true;
    } else {
      const img = new Image();
      img.src = Container.pageSnapshot.toDataURL ? Container.pageSnapshot.toDataURL() : Container.pageSnapshot.src;
      img.onload = () => {
        this.setupShader(img);
        this.webglInitialized = true;
      };
    }
  }

  setupShader(image) {
    const gl = this.gl;
    if (!gl) return;

    const vsSource = `
    attribute vec2 a_position;
    attribute vec2 a_texcoord;
    varying vec2 v_texcoord;

    void main() {
      gl_Position = vec4(a_position, 0, 1);
      v_texcoord = a_texcoord;
    }
  `;

    const fsSource = `
    precision mediump float;
    uniform sampler2D u_image;
    uniform vec2 u_resolution;
    uniform vec2 u_textureSize;
    uniform float u_scrollY;
    uniform float u_pageHeight;
    uniform float u_viewportHeight;
    uniform float u_blurRadius;
    uniform float u_borderRadius;
    uniform vec2 u_containerPosition;
    uniform float u_warp;
    uniform float u_edgeIntensity;
    uniform float u_rimIntensity;
    uniform float u_baseIntensity;
    uniform float u_edgeDistance;
    uniform float u_rimDistance;
    uniform float u_baseDistance;
    uniform float u_cornerBoost;
    uniform float u_rippleEffect;
    uniform float u_tintOpacity;
    uniform vec3 u_tintColor;
    varying vec2 v_texcoord;

    // Function to calculate distance from rounded rectangle edge
    float roundedRectDistance(vec2 coord, vec2 size, float radius) {
      vec2 center = size * 0.5;
      vec2 pixelCoord = coord * size;
      vec2 toCorner = abs(pixelCoord - center) - (center - radius);
      float outsideCorner = length(max(toCorner, 0.0));
      float insideCorner = min(max(toCorner.x, toCorner.y), 0.0);
      return (outsideCorner + insideCorner - radius);
    }
    
    // Function to calculate distance from circle edge (negative inside, positive outside)
    float circleDistance(vec2 coord, vec2 size, float radius) {
      vec2 center = vec2(0.5, 0.5);
      vec2 pixelCoord = coord * size;
      vec2 centerPixel = center * size;
      float distFromCenter = length(pixelCoord - centerPixel);
      return distFromCenter - radius;
    }
    
    // Check if this is a pill (border radius is approximately 50% of height AND width > height)
    bool isPill(vec2 size, float radius) {
      float heightRatioDiff = abs(radius - size.y * 0.5);
      bool radiusMatchesHeight = heightRatioDiff < 2.0;
      bool isWiderThanTall = size.x > size.y + 4.0;
      return radiusMatchesHeight && isWiderThanTall;
    }
    
    // Check if this is a circle (border radius is approximately 50% of smaller dimension AND roughly square)
    bool isCircle(vec2 size, float radius) {
      float minDim = min(size.x, size.y);
      bool radiusMatchesMinDim = abs(radius - minDim * 0.5) < 1.0;
      bool isRoughlySquare = abs(size.x - size.y) < 4.0;
      return radiusMatchesMinDim && isRoughlySquare;
    }
    
    // Function to calculate distance from pill edge (capsule shape)
    float pillDistance(vec2 coord, vec2 size, float radius) {
      vec2 center = size * 0.5;
      vec2 pixelCoord = coord * size;
      vec2 capsuleStart = vec2(radius, center.y);
      vec2 capsuleEnd = vec2(size.x - radius, center.y);
      vec2 capsuleAxis = capsuleEnd - capsuleStart;
      float capsuleLength = length(capsuleAxis);
      
      if (capsuleLength > 0.0) {
        vec2 toPoint = pixelCoord - capsuleStart;
        float t = clamp(dot(toPoint, capsuleAxis) / dot(capsuleAxis, capsuleAxis), 0.0, 1.0);
        vec2 closestPointOnAxis = capsuleStart + t * capsuleAxis;
        return length(pixelCoord - closestPointOnAxis) - radius;
      } else {
        return length(pixelCoord - center) - radius;
      }
    }

    void main() {
      vec2 coord = v_texcoord;
      
      // Calculate which area of the page should be visible through the container
      float scrollY = u_scrollY;
      vec2 containerSize = u_resolution;
      vec2 textureSize = u_textureSize;
      
      // Container position in viewport coordinates
      vec2 containerCenter = u_containerPosition + vec2(0.0, scrollY);
      
      // Convert container coordinates to page coordinates
      vec2 containerOffset = (coord - 0.5) * containerSize;
      vec2 pagePixel = containerCenter + containerOffset;
      
      // Convert to texture coordinate (0 to 1)
      vec2 textureCoord = pagePixel / textureSize;
      
      // Glass refraction effects
      float distFromEdgeShape;
      vec2 shapeNormal;
      
      if (isPill(u_resolution, u_borderRadius)) {
        distFromEdgeShape = -pillDistance(coord, u_resolution, u_borderRadius);
        vec2 center = vec2(0.5, 0.5);
        vec2 pixelCoord = coord * u_resolution;
        vec2 capsuleStart = vec2(u_borderRadius, center.y * u_resolution.y);
        vec2 capsuleEnd = vec2(u_resolution.x - u_borderRadius, center.y * u_resolution.y);
        vec2 capsuleAxis = capsuleEnd - capsuleStart;
        float capsuleLength = length(capsuleAxis);
        
        if (capsuleLength > 0.0) {
          vec2 toPoint = pixelCoord - capsuleStart;
          float t = clamp(dot(toPoint, capsuleAxis) / dot(capsuleAxis, capsuleAxis), 0.0, 1.0);
          vec2 closestPointOnAxis = capsuleStart + t * capsuleAxis;
          vec2 normalDir = pixelCoord - closestPointOnAxis;
          shapeNormal = length(normalDir) > 0.0 ? normalize(normalDir) : vec2(0.0, 1.0);
        } else {
          shapeNormal = normalize(coord - center);
        }
      } else if (isCircle(u_resolution, u_borderRadius)) {
        distFromEdgeShape = -circleDistance(coord, u_resolution, u_borderRadius);
        vec2 center = vec2(0.5, 0.5);
        shapeNormal = normalize(coord - center);
      } else {
        distFromEdgeShape = -roundedRectDistance(coord, u_resolution, u_borderRadius);
        vec2 center = vec2(0.5, 0.5);
        shapeNormal = normalize(coord - center);
      }
      distFromEdgeShape = max(distFromEdgeShape, 0.0);
      
      float distFromLeft = coord.x;
      float distFromRight = 1.0 - coord.x;
      float distFromTop = coord.y;
      float distFromBottom = 1.0 - coord.y;
      float distFromEdge = distFromEdgeShape / min(u_resolution.x, u_resolution.y);
      
      // Smooth glass refraction using shape-aware normal
      float normalizedDistance = distFromEdge * min(u_resolution.x, u_resolution.y);
      float baseIntensity = 1.0 - exp(-normalizedDistance * u_baseDistance);
      float edgeIntensity = exp(-normalizedDistance * u_edgeDistance);
      float rimIntensity = exp(-normalizedDistance * u_rimDistance);
      
      // Apply center warping only if warp is enabled, keep edge and rim effects always
      float baseComponent = u_warp > 0.5 ? baseIntensity * u_baseIntensity : 0.0;
      float totalIntensity = baseComponent + edgeIntensity * u_edgeIntensity + rimIntensity * u_rimIntensity;
      
      vec2 baseRefraction = shapeNormal * totalIntensity;
      
      float cornerProximityX = min(distFromLeft, distFromRight);
      float cornerProximityY = min(distFromTop, distFromBottom);
      float cornerDistance = max(cornerProximityX, cornerProximityY);
      float cornerNormalized = cornerDistance * min(u_resolution.x, u_resolution.y);
      
      float cornerBoost = exp(-cornerNormalized * 0.3) * u_cornerBoost;
      vec2 cornerRefraction = shapeNormal * cornerBoost;
      
      vec2 perpendicular = vec2(-shapeNormal.y, shapeNormal.x);
      float rippleEffect = sin(distFromEdge * 25.0) * u_rippleEffect * rimIntensity;
      vec2 textureRefraction = perpendicular * rippleEffect;
      
      vec2 totalRefraction = baseRefraction + cornerRefraction + textureRefraction;
      textureCoord += totalRefraction;
      
      // Gaussian blur
      vec4 color = vec4(0.0);
      vec2 texelSize = 1.0 / u_textureSize;
      float sigma = u_blurRadius / 2.0;
      vec2 blurStep = texelSize * sigma;
      
      float totalWeight = 0.0;
      
      for(float i = -6.0; i <= 6.0; i += 1.0) {
        for(float j = -6.0; j <= 6.0; j += 1.0) {
          float distance = length(vec2(i, j));
          if(distance > 6.0) continue;
          
          float weight = exp(-(distance * distance) / (2.0 * sigma * sigma));
          vec2 offset = vec2(i, j) * blurStep;
          color += texture2D(u_image, textureCoord + offset) * weight;
          totalWeight += weight;
        }
      }
      
      color /= totalWeight;
      
      // Dark transparent optical glass tint (#0A0714: rgba(10, 7, 20, 0.18))
      vec3 darkGlassTint = u_tintColor;
      
      // Specular edge refraction, subtle violet reflection and rim highlight
      float rimGlow = edgeIntensity * u_edgeIntensity * 2.5 + rimIntensity * u_rimIntensity * 2.0;
      vec3 rimWhite = vec3(1.0, 1.0, 1.0) * (rimGlow * 0.35);
      vec3 rimViolet = vec3(0.32, 0.15, 1.0) * (rimGlow * 0.20);
      vec3 glassHighlight = rimWhite + rimViolet;
      
      // If html2canvas captured DOM background with alpha, blend it beneath dark tint; otherwise pure dark glass tint
      vec3 baseRefracted = color.a > 0.05 ? mix(color.rgb, darkGlassTint, 0.88) : darkGlassTint;
      vec3 finalColor = baseRefracted + glassHighlight;
      
      // Shape mask
      float maskDistance;
      if (isPill(u_resolution, u_borderRadius)) {
        maskDistance = pillDistance(coord, u_resolution, u_borderRadius);
      } else if (isCircle(u_resolution, u_borderRadius)) {
        maskDistance = circleDistance(coord, u_resolution, u_borderRadius);
      } else {
        maskDistance = roundedRectDistance(coord, u_resolution, u_borderRadius);
      }
      float mask = 1.0 - smoothstep(-1.0, 1.0, maskDistance);
      
      // Material alpha: starts at exact 0.18 tint opacity in the body, with subtle rim highlight
      float glassAlpha = mask * clamp(u_tintOpacity + rimGlow * 0.35, 0.0, 0.75);
      
      gl_FragColor = vec4(finalColor, glassAlpha);
    }
  `;

    const program = this.createProgram(gl, vsSource, fsSource);
    if (!program) return;

    gl.useProgram(program);

    // Set up geometry
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]), gl.STATIC_DRAW);

    // Get locations
    const positionLoc = gl.getAttribLocation(program, 'a_position');
    const texcoordLoc = gl.getAttribLocation(program, 'a_texcoord');
    const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
    const textureSizeLoc = gl.getUniformLocation(program, 'u_textureSize');
    const scrollYLoc = gl.getUniformLocation(program, 'u_scrollY');
    const pageHeightLoc = gl.getUniformLocation(program, 'u_pageHeight');
    const viewportHeightLoc = gl.getUniformLocation(program, 'u_viewportHeight');
    const blurRadiusLoc = gl.getUniformLocation(program, 'u_blurRadius');
    const borderRadiusLoc = gl.getUniformLocation(program, 'u_borderRadius');
    const containerPositionLoc = gl.getUniformLocation(program, 'u_containerPosition');
    const warpLoc = gl.getUniformLocation(program, 'u_warp');
    const edgeIntensityLoc = gl.getUniformLocation(program, 'u_edgeIntensity');
    const rimIntensityLoc = gl.getUniformLocation(program, 'u_rimIntensity');
    const baseIntensityLoc = gl.getUniformLocation(program, 'u_baseIntensity');
    const edgeDistanceLoc = gl.getUniformLocation(program, 'u_edgeDistance');
    const rimDistanceLoc = gl.getUniformLocation(program, 'u_rimDistance');
    const baseDistanceLoc = gl.getUniformLocation(program, 'u_baseDistance');
    const cornerBoostLoc = gl.getUniformLocation(program, 'u_cornerBoost');
    const rippleEffectLoc = gl.getUniformLocation(program, 'u_rippleEffect');
    const tintOpacityLoc = gl.getUniformLocation(program, 'u_tintOpacity');
    const tintColorLoc = gl.getUniformLocation(program, 'u_tintColor');
    const imageLoc = gl.getUniformLocation(program, 'u_image');

    // Create texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Store references
    this.gl_refs = {
      gl,
      texture,
      textureSizeLoc,
      scrollYLoc,
      positionLoc,
      texcoordLoc,
      resolutionLoc,
      pageHeightLoc,
      viewportHeightLoc,
      blurRadiusLoc,
      borderRadiusLoc,
      containerPositionLoc,
      warpLoc,
      edgeIntensityLoc,
      rimIntensityLoc,
      baseIntensityLoc,
      edgeDistanceLoc,
      rimDistanceLoc,
      baseDistanceLoc,
      cornerBoostLoc,
      rippleEffectLoc,
      tintOpacityLoc,
      tintColorLoc,
      imageLoc,
      positionBuffer,
      texcoordBuffer
    };

    // Set up viewport and attributes
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.enableVertexAttribArray(texcoordLoc);
    gl.vertexAttribPointer(texcoordLoc, 2, gl.FLOAT, false, 0, 0);

    const controls = (typeof window !== 'undefined' && window.glassControls) ? window.glassControls : {};

    // Set uniforms
    gl.uniform2f(resolutionLoc, this.canvas.width, this.canvas.height);
    gl.uniform2f(textureSizeLoc, image.width, image.height);
    gl.uniform1f(blurRadiusLoc, controls.blurRadius || 5.0);
    gl.uniform1f(borderRadiusLoc, this.borderRadius);
    gl.uniform1f(warpLoc, this.warp ? 1.0 : 0.0);
    gl.uniform1f(edgeIntensityLoc, controls.edgeIntensity || 0.01);
    gl.uniform1f(rimIntensityLoc, controls.rimIntensity || 0.04);
    gl.uniform1f(baseIntensityLoc, controls.baseIntensity || 0.008);
    gl.uniform1f(edgeDistanceLoc, controls.edgeDistance || 0.15);
    gl.uniform1f(rimDistanceLoc, controls.rimDistance || 0.8);
    gl.uniform1f(baseDistanceLoc, controls.baseDistance || 0.1);
    gl.uniform1f(cornerBoostLoc, controls.cornerBoost || 0.02);
    gl.uniform1f(rippleEffectLoc, controls.rippleEffect || 0.08);
    gl.uniform1f(tintOpacityLoc, this.tintOpacity);

    const tintRgb = this.tintColor || [10.0 / 255.0, 7.0 / 255.0, 20.0 / 255.0];
    gl.uniform3f(tintColorLoc, tintRgb[0], tintRgb[1], tintRgb[2]);

    const position = this.getPosition();
    gl.uniform2f(containerPositionLoc, position.x, position.y);

    const pageHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    const viewportHeight = window.innerHeight;
    gl.uniform1f(pageHeightLoc, pageHeight);
    gl.uniform1f(viewportHeightLoc, viewportHeight);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(imageLoc, 0);

    // Start rendering
    this.startRenderLoop();
  }

  startRenderLoop() {
    const render = () => {
      if (!this.gl_refs || !this.gl_refs.gl) return;

      const gl = this.gl_refs.gl;
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Update scroll position
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      if (this.gl_refs.scrollYLoc) {
        gl.uniform1f(this.gl_refs.scrollYLoc, scrollY);
      }

      // Update container position (in case it moved)
      const position = this.getPosition();
      if (this.gl_refs.containerPositionLoc) {
        gl.uniform2f(this.gl_refs.containerPositionLoc, position.x, position.y);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    render();

    this._handleScroll = () => render();
    window.addEventListener('scroll', this._handleScroll, { passive: true });

    this.render = render;
  }

  createProgram(gl, vsSource, fsSource) {
    const vs = this.compileShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = this.compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('Liquid Glass program link error:', gl.getProgramInfoLog(program));
      return null;
    }

    return program;
  }

  compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('Liquid Glass shader compile error:', gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  destroy() {
    const idx = Container.instances.indexOf(this);
    if (idx > -1) {
      Container.instances.splice(idx, 1);
    }

    if (this._handleScroll) {
      window.removeEventListener('scroll', this._handleScroll);
      this._handleScroll = null;
    }

    if (this._rafSizeId) {
      cancelAnimationFrame(this._rafSizeId);
      this._rafSizeId = null;
    }

    if (this.gl) {
      const loseExt = this.gl.getExtension('WEBGL_lose_context');
      if (loseExt) loseExt.loseContext();
      this.gl = null;
    }

    this.gl_refs = {};
    this.webglInitialized = false;

    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.canvas = null;
  }
}

export default Container;
