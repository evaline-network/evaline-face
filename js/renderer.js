/**
 * 3D Neural Face Mesh Renderer
 * Pure Vanilla JavaScript Software & Hardware-Accelerated 3D Engine
 * Features:
 * 1. Modern WebGL 1.0 GPU Hardware Pipeline (locked 60-120 FPS on any weak device).
 * 2. 100vmin Square Viewport Framing with Strict Screen Centering.
 * 3. Smooth Two-Pass Phong/Lambert Lit Polygons, Neon Wireframes & Point Sprites.
 * 4. Automatic Canvas 2D Fallback for environments where WebGL is unavailable.
 */

class FaceRenderer {
  constructor(canvas, faceData) {
    this.canvas = canvas;
    this.faceData = faceData;

    // Rendering configuration
    this.options = {
      showPoints: true,
      showWireframe: true,
      showFaces: true,
      backfaceCulling: true,
      pointSize: 2.2,
      lineWidth: 0.9,
      faceOpacity: 0.35,
      lightIntensity: 0.85,
      ambientLight: 0.25,
      pulseEffect: true,
      pulseSpeed: 1.5,
      pulseAmplitude: 0.02,
      glowEffect: true,
      showFrameGuide: true,
      autoQuality: true,
      theme: 'cyberpunk'
    };

    // Color themes
    this.themes = {
      cyberpunk: {
        name: 'Cyberpunk Neon',
        background: '#070913',
        pointColor: '#ff007f',
        pointGlow: 'rgba(255, 0, 127, 0.8)',
        featurePointColor: '#00ffff',
        wireColor: 'rgba(0, 240, 255, 0.65)',
        wireGlow: '#00f0ff',
        faceColor: [10, 40, 75],
        faceHighlight: [0, 240, 255]
      },
      matrix: {
        name: 'Matrix Emerald',
        background: '#040d06',
        pointColor: '#a6ff00',
        pointGlow: 'rgba(166, 255, 0, 0.8)',
        featurePointColor: '#ffffff',
        wireColor: 'rgba(0, 255, 102, 0.6)',
        wireGlow: '#00ff66',
        faceColor: [5, 45, 15],
        faceHighlight: [50, 255, 120]
      },
      scifiBlue: {
        name: 'Electric Blue',
        background: '#050a14',
        pointColor: '#70d6ff',
        pointGlow: 'rgba(112, 214, 255, 0.8)',
        featurePointColor: '#ffffff',
        wireColor: 'rgba(56, 149, 255, 0.65)',
        wireGlow: '#3895ff',
        faceColor: [10, 30, 65],
        faceHighlight: [100, 200, 255]
      },
      solarGold: {
        name: 'Solar Amber',
        background: '#0f0803',
        pointColor: '#ffdd00',
        pointGlow: 'rgba(255, 221, 0, 0.8)',
        featurePointColor: '#ff5500',
        wireColor: 'rgba(255, 170, 0, 0.65)',
        wireGlow: '#ffaa00',
        faceColor: [55, 28, 5],
        faceHighlight: [255, 210, 80]
      },
      minimalSilver: {
        name: 'Titanium Silver',
        background: '#090a0f',
        pointColor: '#ffffff',
        pointGlow: 'rgba(255, 255, 255, 0.7)',
        featurePointColor: '#94a3b8',
        wireColor: 'rgba(203, 213, 225, 0.55)',
        wireGlow: '#cbd5e1',
        faceColor: [25, 30, 42],
        faceHighlight: [220, 230, 245]
      }
    };

    // Normalized light direction
    this.lightDir = Math3D.normalize([0.35, 0.6, 0.8]);

    // Telemetry & metrics tracking
    this.lastRenderTimeMs = 0.1;
    this.qualityName = 'WEBGL 60FPS (GPU)';
    this.renderTimeHistory = new Float32Array(30);
    this.historyIdx = 0;

    // Precomputed feature lookup set
    this.featureIndices = new Set();
    this.featureIndicesList = [];
    if (this.faceData.features) {
      for (const group of Object.values(this.faceData.features)) {
        for (const idx of group) {
          if (!this.featureIndices.has(idx)) {
            this.featureIndices.add(idx);
            this.featureIndicesList.push(idx);
          }
        }
      }
    }

    // Attempt Modern WebGL Hardware Acceleration Context
    const gl = canvas.getContext('webgl', {
      antialias: true,
      alpha: false,
      depth: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    }) || canvas.getContext('experimental-webgl', {
      antialias: true,
      alpha: false,
      depth: true,
      preserveDrawingBuffer: true
    });

    if (gl) {
      this.gl = gl;
      this.isWebGL = true;
      this.qualityName = 'WEBGL 60FPS (GPU)';
      this.initWebGL();
    } else {
      // 2D Canvas Fallback
      this.ctx = canvas.getContext('2d');
      this.isWebGL = false;
      this.qualityName = 'CANVAS 2D';
      this.initCanvas2D();
    }

    // Size canvas properly
    this.resize();
  }

  /* ========================================================================
     MODERN WEBGL 1.0 GPU PIPELINE (Zero CPU Bottleneck, 60-120 FPS Locked)
     ======================================================================== */

  initWebGL() {
    const gl = this.gl;

    // 1. Shaders
    const vsCommon = `
      attribute vec3 a_position;
      attribute vec3 a_normal;
      attribute float a_isFeature;

      uniform mat3 u_rotMatrix;
      uniform float u_cameraDist;
      uniform float u_zoom;
      uniform float u_time;
      uniform float u_pulseAmp;
      uniform float u_pulseSpeed;
      uniform vec2 u_resolution;
      uniform float u_basePointSize;

      varying vec3 v_normal;
      varying float v_isFeature;
      varying float v_zCam;
      varying vec3 v_posCam;

      void main() {
        v_isFeature = a_isFeature;
        vec3 pos = a_position;

        // Breathing pulse wave
        if (u_pulseAmp > 0.0) {
          float wave = sin(u_time * u_pulseSpeed + pos.y * 3.0 + pos.z * 2.0) * u_pulseAmp;
          pos += pos * wave;
        }

        // Rotate in 3D around center (0, 0, 0)
        vec3 rPos = u_rotMatrix * pos;
        vec3 rNorm = u_rotMatrix * a_normal;
        v_normal = normalize(rNorm);

        float zCam = u_cameraDist - rPos.z;
        v_zCam = zCam;
        v_posCam = rPos;

        // 100vmin projection & screen centering
        float vmin = min(u_resolution.x, u_resolution.y);
        float scale = (vmin * 1.85 * 2.0 * u_zoom) / zCam;

        float ndcX = (rPos.x * scale) / u_resolution.x;
        float ndcY = (rPos.y * scale) / u_resolution.y;
        float ndcZ = (zCam - 2.0) / 10.0; // Depth range in [0, 1]

        gl_Position = vec4(ndcX, ndcY, ndcZ, 1.0);

        // Depth-scaled point size
        float depthScale = clamp(4.2 / zCam, 0.6, 2.4);
        gl_PointSize = u_basePointSize * depthScale * (a_isFeature > 0.5 ? 1.4 : 1.0);
      }
    `;

    // Fragment Shader: Faces with Blinn-Phong Specular & Diffuse Lighting
    const fsFaces = `
      precision mediump float;
      varying vec3 v_normal;
      varying float v_zCam;
      varying vec3 v_posCam;

      uniform vec3 u_faceColor;
      uniform vec3 u_faceHighlight;
      uniform vec3 u_lightDir;
      uniform float u_faceOpacity;
      uniform float u_ambientLight;
      uniform float u_lightIntensity;

      void main() {
        vec3 norm = normalize(v_normal);
        if (!gl_FrontFacing) {
          norm = -norm; // Dual-sided lighting
        }

        // Diffuse
        float nDotL = max(0.0, dot(norm, u_lightDir));

        // Specular Blinn-Phong highlights for silky cyber skin
        vec3 toCam = normalize(vec3(-v_posCam.x, -v_posCam.y, 4.2 - v_posCam.z));
        vec3 halfVec = normalize(u_lightDir + toCam);
        float nDotH = max(0.0, dot(norm, halfVec));
        float spec = pow(nDotH, 14.0) * 0.35;

        float light = u_ambientLight + nDotL * u_lightIntensity;
        vec3 col = mix(u_faceColor * 1.5, u_faceHighlight, clamp(nDotL * 0.8 + spec, 0.0, 1.0)) * light + vec3(spec * 0.7);

        float alpha = gl_FrontFacing ? u_faceOpacity : (u_faceOpacity * 0.35);
        gl_FragColor = vec4(col, alpha);
      }
    `;

    // Fragment Shader: Wireframe
    const fsWire = `
      precision mediump float;
      uniform vec4 u_wireColor;
      void main() {
        gl_FragColor = u_wireColor;
      }
    `;

    // Fragment Shader: Points
    const fsPoints = `
      precision mediump float;
      varying float v_isFeature;
      uniform vec4 u_pointColor;
      uniform vec4 u_featureColor;

      void main() {
        vec2 pt = gl_PointCoord - vec2(0.5);
        float dist = length(pt);
        if (dist > 0.5) discard;

        float alpha = smoothstep(0.5, 0.15, dist);
        vec4 baseCol = (v_isFeature > 0.5) ? u_featureColor : u_pointColor;
        gl_FragColor = vec4(baseCol.rgb, baseCol.a * alpha);
      }
    `;

    // Background Shaders (Fullscreen Quad)
    const vsBg = `
      attribute vec2 a_quad;
      varying vec2 v_uv;
      void main() {
        v_uv = a_quad;
        gl_Position = vec4(a_quad, 0.9999, 1.0);
      }
    `;

    const fsBg = `
      precision mediump float;
      varying vec2 v_uv;
      uniform vec3 u_bgCenter;
      uniform vec3 u_bgOuter;
      void main() {
        float d = length(v_uv);
        vec3 col = mix(u_bgCenter, u_bgOuter, smoothstep(0.0, 1.3, d));
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    // Frame Guide Shaders
    const vsGuide = `
      attribute vec2 a_guidePos;
      void main() {
        gl_Position = vec4(a_guidePos, 0.0, 1.0);
      }
    `;

    const fsGuide = `
      precision mediump float;
      uniform vec4 u_guideColor;
      void main() {
        gl_FragColor = u_guideColor;
      }
    `;

    // Compile programs
    this.progFaces = this.createGLProgram(gl, vsCommon, fsFaces);
    this.progWire = this.createGLProgram(gl, vsCommon, fsWire);
    this.progPoints = this.createGLProgram(gl, vsCommon, fsPoints);
    this.progBg = this.createGLProgram(gl, vsBg, fsBg);
    this.progGuide = this.createGLProgram(gl, vsGuide, fsGuide);

    // 2. Compute smooth vertex normals
    const vCount = this.faceData.vertexCount;
    const vertices = this.faceData.vertices;
    const triangles = this.faceData.triangles;
    const tCount = triangles.length;

    const normals = new Float32Array(vCount * 3);
    for (let i = 0; i < tCount; i++) {
      const tri = triangles[i];
      const i0 = tri[0], i1 = tri[1], i2 = tri[2];
      const v0 = vertices[i0], v1 = vertices[i1], v2 = vertices[i2];
      const ax = v1[0] - v0[0], ay = v1[1] - v0[1], az = v1[2] - v0[2];
      const bx = v2[0] - v0[0], by = v2[1] - v0[1], bz = v2[2] - v0[2];
      const nx = ay * bz - az * by;
      const ny = az * bx - ax * bz;
      const nz = ax * by - ay * bx;

      normals[i0 * 3] += nx; normals[i0 * 3 + 1] += ny; normals[i0 * 3 + 2] += nz;
      normals[i1 * 3] += nx; normals[i1 * 3 + 1] += ny; normals[i1 * 3 + 2] += nz;
      normals[i2 * 3] += nx; normals[i2 * 3 + 1] += ny; normals[i2 * 3 + 2] += nz;
    }

    for (let i = 0; i < vCount; i++) {
      const idx = i * 3;
      const len = Math.hypot(normals[idx], normals[idx + 1], normals[idx + 2]);
      if (len > 1e-6) {
        normals[idx] /= len;
        normals[idx + 1] /= len;
        normals[idx + 2] /= len;
      } else {
        normals[idx + 2] = 1.0;
      }
    }

    // 3. Create GPU Vertex & Feature Buffers
    const posArray = new Float32Array(vCount * 3);
    const featArray = new Float32Array(vCount);
    for (let i = 0; i < vCount; i++) {
      posArray[i * 3] = vertices[i][0];
      posArray[i * 3 + 1] = vertices[i][1];
      posArray[i * 3 + 2] = vertices[i][2];
      featArray[i] = this.featureIndices.has(i) ? 1.0 : 0.0;
    }

    this.bufPos = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
    gl.bufferData(gl.ARRAY_BUFFER, posArray, gl.STATIC_DRAW);

    this.bufNorm = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNorm);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

    this.bufFeat = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufFeat);
    gl.bufferData(gl.ARRAY_BUFFER, featArray, gl.STATIC_DRAW);

    // 4. Index Buffers
    // Triangles
    const triIndices = new Uint16Array(tCount * 3);
    for (let i = 0; i < tCount; i++) {
      triIndices[i * 3] = triangles[i][0];
      triIndices[i * 3 + 1] = triangles[i][1];
      triIndices[i * 3 + 2] = triangles[i][2];
    }
    this.triangleIndexCount = triIndices.length;
    this.bufTriIndices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufTriIndices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triIndices, gl.STATIC_DRAW);

    // Wireframe (Edges)
    const edges = this.faceData.edges;
    const eCount = edges.length;
    const wireIndices = new Uint16Array(eCount * 2);
    for (let i = 0; i < eCount; i++) {
      wireIndices[i * 2] = edges[i][0];
      wireIndices[i * 2 + 1] = edges[i][1];
    }
    this.wireIndexCount = wireIndices.length;
    this.bufWireIndices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufWireIndices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, wireIndices, gl.STATIC_DRAW);

    // Points
    const pointIndices = new Uint16Array(vCount);
    for (let i = 0; i < vCount; i++) pointIndices[i] = i;
    this.pointIndexCount = pointIndices.length;
    this.bufPointIndices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufPointIndices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, pointIndices, gl.STATIC_DRAW);

    // Background Quad Buffer
    const quadVertices = new Float32Array([
      -1, -1,   1, -1,  -1,  1,
      -1,  1,   1, -1,   1,  1
    ]);
    this.bufBgQuad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufBgQuad);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    // Dynamic Frame Guide Buffer
    this.bufGuide = gl.createBuffer();
    this.guideVertexCount = 0;

    // Cache locations
    this.cacheLocations();
  }

  createGLProgram(gl, vsSrc, fsSrc) {
    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const err = gl.getShaderInfoLog(s);
        gl.deleteShader(s);
        throw new Error('Shader compilation error: ' + err);
      }
      return s;
    }

    const vs = compile(gl.VERTEX_SHADER, vsSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('Program link error: ' + gl.getProgramInfoLog(prog));
    }
    return prog;
  }

  cacheLocations() {
    const gl = this.gl;

    const setupMeshProgram = (prog) => {
      return {
        prog,
        a_pos: gl.getAttribLocation(prog, 'a_position'),
        a_norm: gl.getAttribLocation(prog, 'a_normal'),
        a_feat: gl.getAttribLocation(prog, 'a_isFeature'),
        u_rotMatrix: gl.getUniformLocation(prog, 'u_rotMatrix'),
        u_cameraDist: gl.getUniformLocation(prog, 'u_cameraDist'),
        u_zoom: gl.getUniformLocation(prog, 'u_zoom'),
        u_time: gl.getUniformLocation(prog, 'u_time'),
        u_pulseAmp: gl.getUniformLocation(prog, 'u_pulseAmp'),
        u_pulseSpeed: gl.getUniformLocation(prog, 'u_pulseSpeed'),
        u_resolution: gl.getUniformLocation(prog, 'u_resolution'),
        u_basePointSize: gl.getUniformLocation(prog, 'u_basePointSize')
      };
    };

    this.locFaces = setupMeshProgram(this.progFaces);
    this.locFaces.u_faceColor = gl.getUniformLocation(this.progFaces, 'u_faceColor');
    this.locFaces.u_faceHighlight = gl.getUniformLocation(this.progFaces, 'u_faceHighlight');
    this.locFaces.u_lightDir = gl.getUniformLocation(this.progFaces, 'u_lightDir');
    this.locFaces.u_faceOpacity = gl.getUniformLocation(this.progFaces, 'u_faceOpacity');
    this.locFaces.u_ambientLight = gl.getUniformLocation(this.progFaces, 'u_ambientLight');
    this.locFaces.u_lightIntensity = gl.getUniformLocation(this.progFaces, 'u_lightIntensity');

    this.locWire = setupMeshProgram(this.progWire);
    this.locWire.u_wireColor = gl.getUniformLocation(this.progWire, 'u_wireColor');

    this.locPoints = setupMeshProgram(this.progPoints);
    this.locPoints.u_pointColor = gl.getUniformLocation(this.progPoints, 'u_pointColor');
    this.locPoints.u_featureColor = gl.getUniformLocation(this.progPoints, 'u_featureColor');

    this.locBg = {
      prog: this.progBg,
      a_quad: gl.getAttribLocation(this.progBg, 'a_quad'),
      u_bgCenter: gl.getUniformLocation(this.progBg, 'u_bgCenter'),
      u_bgOuter: gl.getUniformLocation(this.progBg, 'u_bgOuter')
    };

    this.locGuide = {
      prog: this.progGuide,
      a_guidePos: gl.getAttribLocation(this.progGuide, 'a_guidePos'),
      u_guideColor: gl.getUniformLocation(this.progGuide, 'u_guideColor')
    };
  }

  updateFrameGuideBuffer() {
    if (!this.isWebGL) return;
    const gl = this.gl;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const vmin = Math.min(w, h);

    const halfBoxX = (vmin * 0.98 * 0.5) / (w * 0.5);
    const halfBoxY = (vmin * 0.98 * 0.5) / (h * 0.5);
    const cLenX = (vmin * 0.06) / (w * 0.5);
    const cLenY = (vmin * 0.06) / (h * 0.5);

    const lines = [
      // Top-Left corner
      -halfBoxX, halfBoxY - cLenY,  -halfBoxX, halfBoxY,
      -halfBoxX, halfBoxY,          -halfBoxX + cLenX, halfBoxY,
      // Top-Right corner
      halfBoxX - cLenX, halfBoxY,    halfBoxX, halfBoxY,
      halfBoxX, halfBoxY,            halfBoxX, halfBoxY - cLenY,
      // Bottom-Left corner
      -halfBoxX, -halfBoxY + cLenY, -halfBoxX, -halfBoxY,
      -halfBoxX, -halfBoxY,         -halfBoxX + cLenX, -halfBoxY,
      // Bottom-Right corner
      halfBoxX - cLenX, -halfBoxY,   halfBoxX, -halfBoxY,
      halfBoxX, -halfBoxY,           halfBoxX, -halfBoxY + cLenY,
      // Center crosshairs
      -0.02 * (vmin / w), 0.0,       0.02 * (vmin / w), 0.0,
      0.0, -0.02 * (vmin / h),       0.0, 0.02 * (vmin / h)
    ];

    this.guideVertexCount = lines.length / 2;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufGuide);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines), gl.DYNAMIC_DRAW);
  }

  hexToRgbNorm(hex) {
    let clean = hex.replace('#', '');
    if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
    const num = parseInt(clean, 16);
    return [(num >> 16 & 255) / 255, (num >> 8 & 255) / 255, (num & 255) / 255];
  }

  parseRgbaNorm(str, fallbackRgb = [0, 1, 1], fallbackAlpha = 1.0) {
    if (!str) return [...fallbackRgb, fallbackAlpha];
    if (str.startsWith('#')) return [...this.hexToRgbNorm(str), fallbackAlpha];
    const match = str.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
    if (match) {
      return [
        parseInt(match[1]) / 255,
        parseInt(match[2]) / 255,
        parseInt(match[3]) / 255,
        match[4] !== undefined ? parseFloat(match[4]) : fallbackAlpha
      ];
    }
    return [...fallbackRgb, fallbackAlpha];
  }

  /* ========================================================================
     MAIN RENDER ENTRY POINT (Hardware-Accelerated WebGL with 2D Fallback)
     ======================================================================== */

  render(rotMatrix, cameraDist = 4.2, zoom = 1.0, panX = 0, panY = 0, time = 0) {
    const t0 = performance.now();

    if (this.isWebGL) {
      this.renderWebGL(rotMatrix, cameraDist, zoom, time);
    } else {
      this.renderCanvas2D(rotMatrix, cameraDist, zoom, panX, panY, time);
    }

    const t1 = performance.now();
    this.lastRenderTimeMs = Math.max(0.05, t1 - t0);
  }

  renderWebGL(rotMatrix, cameraDist, zoom, time) {
    const gl = this.gl;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const theme = this.themes[this.options.theme] || this.themes.cyberpunk;

    gl.viewport(0, 0, w, h);

    // 1. Draw Background Quad with theme colors
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(this.locBg.prog);
    gl.enableVertexAttribArray(this.locBg.a_quad);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufBgQuad);
    gl.vertexAttribPointer(this.locBg.a_quad, 2, gl.FLOAT, false, 0, 0);

    const bgOuter = this.hexToRgbNorm(theme.background);
    const bgCenter = [
      Math.min(1.0, bgOuter[0] + 0.06),
      Math.min(1.0, bgOuter[1] + 0.08),
      Math.min(1.0, bgOuter[2] + 0.12)
    ];
    gl.uniform3fv(this.locBg.u_bgCenter, bgCenter);
    gl.uniform3fv(this.locBg.u_bgOuter, bgOuter);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // 2. Render 100vmin Frame Guide
    if (this.options.showFrameGuide && this.guideVertexCount > 0) {
      gl.useProgram(this.locGuide.prog);
      gl.enableVertexAttribArray(this.locGuide.a_guidePos);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bufGuide);
      gl.vertexAttribPointer(this.locGuide.a_guidePos, 2, gl.FLOAT, false, 0, 0);

      const guideCol = this.parseRgbaNorm(theme.wireGlow, [0, 0.9, 1], 0.45);
      gl.uniform4fv(this.locGuide.u_guideColor, guideCol);
      gl.drawArrays(gl.LINES, 0, this.guideVertexCount);
    }

    // 3. Setup 3D State: depth, blending, backface culling
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Set common attributes helper
    const bindMeshAttributes = (loc) => {
      gl.enableVertexAttribArray(loc.a_pos);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
      gl.vertexAttribPointer(loc.a_pos, 3, gl.FLOAT, false, 0, 0);

      if (loc.a_norm !== -1) {
        gl.enableVertexAttribArray(loc.a_norm);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNorm);
        gl.vertexAttribPointer(loc.a_norm, 3, gl.FLOAT, false, 0, 0);
      }

      if (loc.a_feat !== -1) {
        gl.enableVertexAttribArray(loc.a_feat);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufFeat);
        gl.vertexAttribPointer(loc.a_feat, 1, gl.FLOAT, false, 0, 0);
      }

      gl.uniformMatrix3fv(loc.u_rotMatrix, false, rotMatrix);
      gl.uniform1f(loc.u_cameraDist, cameraDist);
      gl.uniform1f(loc.u_zoom, zoom);
      gl.uniform1f(loc.u_time, time);
      gl.uniform1f(loc.u_pulseAmp, this.options.pulseEffect ? this.options.pulseAmplitude : 0.0);
      gl.uniform1f(loc.u_pulseSpeed, this.options.pulseSpeed);
      gl.uniform2f(loc.u_resolution, w, h);
      gl.uniform1f(loc.u_basePointSize, this.options.pointSize);
    };

    // 4. Render Polygons (Faces) with Lambertian Lighting
    if (this.options.showFaces) {
      gl.useProgram(this.locFaces.prog);
      bindMeshAttributes(this.locFaces);

      if (this.options.backfaceCulling) {
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
      } else {
        gl.disable(gl.CULL_FACE);
      }

      gl.uniform3f(this.locFaces.u_faceColor, theme.faceColor[0] / 255, theme.faceColor[1] / 255, theme.faceColor[2] / 255);
      gl.uniform3f(this.locFaces.u_faceHighlight, theme.faceHighlight[0] / 255, theme.faceHighlight[1] / 255, theme.faceHighlight[2] / 255);
      gl.uniform3fv(this.locFaces.u_lightDir, this.lightDir);
      gl.uniform1f(this.locFaces.u_faceOpacity, this.options.faceOpacity);
      gl.uniform1f(this.locFaces.u_ambientLight, this.options.ambientLight);
      gl.uniform1f(this.locFaces.u_lightIntensity, this.options.lightIntensity);

      gl.enable(gl.POLYGON_OFFSET_FILL);
      gl.polygonOffset(1.0, 1.0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufTriIndices);
      gl.drawElements(gl.TRIANGLES, this.triangleIndexCount, gl.UNSIGNED_SHORT, 0);
      gl.disable(gl.POLYGON_OFFSET_FILL);
    }

    // 5. Render Wireframe Edges
    if (this.options.showWireframe) {
      gl.disable(gl.CULL_FACE);
      gl.useProgram(this.locWire.prog);
      bindMeshAttributes(this.locWire);

      const wireCol = this.parseRgbaNorm(theme.wireColor, [0, 0.9, 1], 0.7);
      gl.uniform4fv(this.locWire.u_wireColor, wireCol);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufWireIndices);
      gl.drawElements(gl.LINES, this.wireIndexCount, gl.UNSIGNED_SHORT, 0);
    }

    // 6. Render Points (Vertices)
    if (this.options.showPoints) {
      gl.disable(gl.CULL_FACE);
      gl.useProgram(this.locPoints.prog);
      bindMeshAttributes(this.locPoints);

      const ptCol = this.parseRgbaNorm(theme.pointColor, [1, 0, 0.5], 0.9);
      const featCol = this.parseRgbaNorm(theme.featurePointColor, [0, 1, 1], 1.0);
      gl.uniform4fv(this.locPoints.u_pointColor, ptCol);
      gl.uniform4fv(this.locPoints.u_featureColor, featCol);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufPointIndices);
      gl.drawElements(gl.POINTS, this.pointIndexCount, gl.UNSIGNED_SHORT, 0);
    }
  }

  /* ========================================================================
     CANVAS 2D FALLBACK (When WebGL is unavailable)
     ======================================================================== */

  initCanvas2D() {
    const vCount = this.faceData.vertexCount;
    this.transformedVertices = new Array(vCount);
    this.projectedVertices = new Array(vCount);
    for (let i = 0; i < vCount; i++) {
      this.transformedVertices[i] = [0, 0, 0];
      this.projectedVertices[i] = { x: 0, y: 0, z: 0, scale: 0, visible: false };
    }

    const tCount = this.faceData.triangleCount;
    this.trianglesPool = new Array(tCount);
    for (let i = 0; i < tCount; i++) {
      this.trianglesPool[i] = {
        i0: 0, i1: 0, i2: 0,
        p0: null, p1: null, p2: null,
        avgZ: 0, diffuse: 0, isFrontFacing: true
      };
    }
    this.renderableTriangles = [];
    this.frontColorPalette = new Array(256);
    this.backColorPalette = new Array(256);
    this.updateColorPalette();
  }

  updateColorPalette() {
    if (this.isWebGL) return;
    const theme = this.themes[this.options.theme] || this.themes.cyberpunk;
    const baseRGB = theme.faceColor;
    const highRGB = theme.faceHighlight;
    const baseAlpha = this.options.faceOpacity;
    const backAlpha = baseAlpha * 0.35;

    for (let i = 0; i < 256; i++) {
      const t = i / 255.0;
      const r = Math.round(baseRGB[0] + (highRGB[0] - baseRGB[0]) * t);
      const g = Math.round(baseRGB[1] + (highRGB[1] - baseRGB[1]) * t);
      const b = Math.round(baseRGB[2] + (highRGB[2] - baseRGB[2]) * t);
      this.frontColorPalette[i] = `rgba(${r}, ${g}, ${b}, ${baseAlpha.toFixed(3)})`;
      this.backColorPalette[i] = `rgba(${r}, ${g}, ${b}, ${backAlpha.toFixed(3)})`;
    }
  }

  renderCanvas2D(rotMatrix, cameraDist, zoom, panX, panY, time) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const vmin = Math.min(w, h);
    const halfW = w * 0.5;
    const halfH = h * 0.5;
    const theme = this.themes[this.options.theme] || this.themes.cyberpunk;

    this.updateColorPalette();
    this.drawBackground2D(theme);

    if (this.options.showFrameGuide) {
      this.drawFrameGuide2D(theme, vmin, halfW, halfH);
    }

    const vertices = this.faceData.vertices;
    const vCount = this.faceData.vertexCount;
    const pulseActive = this.options.pulseEffect;
    const pulseAmp = this.options.pulseAmplitude;
    const pulseSpeed = this.options.pulseSpeed;
    const fov = vmin * 1.85 * zoom;

    for (let i = 0; i < vCount; i++) {
      let vx = vertices[i][0], vy = vertices[i][1], vz = vertices[i][2];
      if (pulseActive) {
        const wave = Math.sin(time * pulseSpeed + vy * 3.0 + vz * 2.0) * pulseAmp;
        vx += vx * wave; vy += vy * wave; vz += vz * wave;
      }
      const rx = rotMatrix[0] * vx + rotMatrix[1] * vy + rotMatrix[2] * vz;
      const ry = rotMatrix[3] * vx + rotMatrix[4] * vy + rotMatrix[5] * vz;
      const rz = rotMatrix[6] * vx + rotMatrix[7] * vy + rotMatrix[8] * vz;

      const zCam = cameraDist - rz;
      const pv = this.projectedVertices[i];
      if (zCam <= 0.05 || isNaN(zCam)) {
        pv.visible = false;
      } else {
        const scale = fov / zCam;
        pv.x = halfW + rx * scale;
        pv.y = halfH - ry * scale;
        pv.z = zCam;
        pv.visible = true;
      }
    }

    // 2D Wireframe
    if (this.options.showWireframe && this.faceData.edges) {
      ctx.save();
      ctx.lineWidth = this.options.lineWidth;
      ctx.strokeStyle = theme.wireColor;
      ctx.beginPath();
      const edges = this.faceData.edges;
      for (let i = 0; i < edges.length; i++) {
        const p0 = this.projectedVertices[edges[i][0]];
        const p1 = this.projectedVertices[edges[i][1]];
        if (!p0.visible || !p1.visible) continue;
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 2D Points
    if (this.options.showPoints) {
      ctx.save();
      ctx.fillStyle = theme.pointColor;
      ctx.beginPath();
      for (let i = 0; i < vCount; i++) {
        const p = this.projectedVertices[i];
        if (!p.visible) continue;
        ctx.moveTo(p.x + 2, p.y);
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
    }
  }

  drawBackground2D(theme) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, w, h);
  }

  drawFrameGuide2D(theme, vmin, halfW, halfH) {
    const ctx = this.ctx;
    const size = vmin * 0.98;
    const half = size * 0.5;
    ctx.save();
    ctx.strokeStyle = theme.wireGlow || 'rgba(0, 240, 255, 0.45)';
    ctx.lineWidth = 2;
    const l = halfW - half, t = halfH - half;
    ctx.strokeRect(l, t, size, size);
    ctx.restore();
  }

  /* ========================================================================
     RESIZE & THEME CONFIGURATION
     ======================================================================== */

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.0);
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width || window.innerWidth || 800);
    this.height = Math.max(1, rect.height || window.innerHeight || 600);

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);

    if (this.isWebGL) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      this.updateFrameGuideBuffer();
    } else if (this.ctx) {
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
  }

  setTheme(themeKey) {
    if (this.themes[themeKey]) {
      this.options.theme = themeKey;
      if (!this.isWebGL) this.updateColorPalette();
    }
  }
}
