/**
 * 3D Face Canvas Renderer
 * Pure Vanilla JavaScript Software 3D Pipeline
 */

class FaceRenderer {
  constructor(canvas, faceData) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.faceData = faceData;

    // Rendering configuration
    this.options = {
      showPoints: true,
      showWireframe: true,
      showFaces: true,
      backfaceCulling: false,
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
        faceColor: [10, 40, 75],      // Base RGB for faces
        faceHighlight: [0, 240, 255]  // Highlight RGB
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

    // Normalized light direction: coming slightly from top-right-front
    this.lightDir = Math3D.normalize([0.35, 0.6, 0.8]);

    // Precomputed feature lookup set for fast O(1) checks
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

    // Allocate reusable buffers to completely eliminate Garbage Collection stutter
    const vCount = this.faceData.vertexCount;
    this.transformedVertices = new Array(vCount);
    this.projectedVertices = new Array(vCount);
    for (let i = 0; i < vCount; i++) {
      this.transformedVertices[i] = [0, 0, 0];
      this.projectedVertices[i] = { x: 0, y: 0, z: 0, scale: 0, visible: false };
    }

    // Preallocated triangle descriptor pool to eliminate allocations per frame
    const tCount = this.faceData.triangleCount;
    this.trianglesPool = new Array(tCount);
    for (let i = 0; i < tCount; i++) {
      this.trianglesPool[i] = {
        i0: 0, i1: 0, i2: 0,
        p0: null, p1: null, p2: null,
        avgZ: 0,
        diffuse: 0,
        isFrontFacing: true
      };
    }
    this.renderableTriangles = [];

    // Precomputed color palette to eliminate string allocations in render loop
    this.frontColorPalette = new Array(256);
    this.backColorPalette = new Array(256);
    this.cachedPaletteKey = '';
    this.updateColorPalette();

    // Handle high DPI
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.0);
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width || window.innerWidth || 800);
    this.height = Math.max(1, rect.height || window.innerHeight || 600);

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setTheme(themeKey) {
    if (this.themes[themeKey]) {
      this.options.theme = themeKey;
      this.updateColorPalette();
    }
  }

  /**
   * Precompute 256 discrete color levels for face shading
   * Eliminates up to ~900 dynamic string allocations per frame!
   */
  updateColorPalette() {
    const theme = this.themes[this.options.theme] || this.themes.cyberpunk;
    const baseRGB = theme.faceColor;
    const highRGB = theme.faceHighlight;
    const baseAlpha = this.options.faceOpacity;
    const backAlpha = baseAlpha * 0.35;

    const paletteKey = `${this.options.theme}_${baseAlpha}`;
    if (this.cachedPaletteKey === paletteKey) return;
    this.cachedPaletteKey = paletteKey;

    for (let i = 0; i < 256; i++) {
      const factor = i / 255.0;
      const r = Math.min(255, Math.floor(baseRGB[0] + (highRGB[0] - baseRGB[0]) * factor));
      const g = Math.min(255, Math.floor(baseRGB[1] + (highRGB[1] - baseRGB[1]) * factor));
      const b = Math.min(255, Math.floor(baseRGB[2] + (highRGB[2] - baseRGB[2]) * factor));

      this.frontColorPalette[i] = `rgba(${r}, ${g}, ${b}, ${baseAlpha.toFixed(3)})`;
      this.backColorPalette[i] = `rgba(${r}, ${g}, ${b}, ${backAlpha.toFixed(3)})`;
    }
  }

  /**
   * Render frame
   * @param {number[]|Float32Array} rotMatrix 3x3 rotation matrix
   * @param {number} cameraDist Camera distance from origin
   * @param {number} zoom Multiplier for FOV
   * @param {number} panX Horizontal camera pan
   * @param {number} panY Vertical camera pan
   * @param {number} time Elapsed time in seconds for pulse/morph
   */
  render(rotMatrix, cameraDist = 4.2, zoom = 1.0, panX = 0, panY = 0, time = 0) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const vmin = Math.min(w, h);
    const halfW = w * 0.5;
    const halfH = h * 0.5;
    const theme = this.themes[this.options.theme] || this.themes.cyberpunk;

    // Ensure color palette is up-to-date
    this.updateColorPalette();

    // 1. Clear background with subtle radial gradient centered on canvas
    this.drawBackground(theme);

    // 1b. Subtle 100vmin bounding guide with cyber corner brackets
    if (this.options.showFrameGuide) {
      this.drawFrameGuide(theme, vmin, halfW, halfH);
    }

    const vertices = this.faceData.vertices;
    const vCount = this.faceData.vertexCount;
    const triangles = this.faceData.triangles;
    const tCount = this.faceData.triangleCount;

    // Subtle organic breathing / holographic pulse
    const pulseActive = this.options.pulseEffect;
    const pulseAmp = this.options.pulseAmplitude;
    const pulseSpeed = this.options.pulseSpeed;

    // Light direction components
    const lx = this.lightDir[0], ly = this.lightDir[1], lz = this.lightDir[2];

    // 2. Transform & project vertices in-place (ZERO heap allocation)
    // Head fits cleanly inside a 100vmin bounding box (vmin = Math.min(w, h))
    const fov = vmin * 1.85 * zoom;

    for (let i = 0; i < vCount; i++) {
      let vx = vertices[i][0];
      let vy = vertices[i][1];
      let vz = vertices[i][2];

      if (pulseActive) {
        // Micro-pulse wave across height and time
        const wave = Math.sin(time * pulseSpeed + vy * 3.0 + vz * 2.0) * pulseAmp;
        vx += vx * wave;
        vy += vy * wave;
        vz += vz * wave;
      }

      // Rotate vertex around model center (0, 0, 0)
      const rx = rotMatrix[0] * vx + rotMatrix[1] * vy + rotMatrix[2] * vz;
      const ry = rotMatrix[3] * vx + rotMatrix[4] * vy + rotMatrix[5] * vz;
      const rz = rotMatrix[6] * vx + rotMatrix[7] * vy + rotMatrix[8] * vz;

      const tv = this.transformedVertices[i];
      tv[0] = rx;
      tv[1] = ry;
      tv[2] = rz;

      // Project to 2D in-place: Camera is at (0, 0, cameraDist) looking along -Z axis
      // Model center always maps to (halfW, halfH) - strictly centered on screen
      const zCam = cameraDist - rz;
      const pv = this.projectedVertices[i];

      if (zCam <= 0.05 || isNaN(zCam)) {
        pv.visible = false;
      } else {
        const scale = fov / zCam;
        pv.x = halfW + rx * scale;
        pv.y = halfH - ry * scale; // Invert Y for screen coordinates
        pv.z = zCam;
        pv.scale = scale;
        pv.visible = true;
      }
    }

    // 3. Process Triangles: normals, lighting, depth, backface culling in-place
    let renderableCount = 0;
    const doCulling = this.options.backfaceCulling;

    for (let t = 0; t < tCount; t++) {
      const tri = triangles[t];
      const i0 = tri[0], i1 = tri[1], i2 = tri[2];

      const p0 = this.projectedVertices[i0];
      const p1 = this.projectedVertices[i1];
      const p2 = this.projectedVertices[i2];

      if (!p0.visible || !p1.visible || !p2.visible) continue;

      const t0 = this.transformedVertices[i0];
      const t1 = this.transformedVertices[i1];
      const t2 = this.transformedVertices[i2];

      // In-place surface normal in camera space (ZERO arrays allocated)
      const e1x = t1[0] - t0[0], e1y = t1[1] - t0[1], e1z = t1[2] - t0[2];
      const e2x = t2[0] - t0[0], e2y = t2[1] - t0[1], e2z = t2[2] - t0[2];
      const nx = e1y * e2z - e1z * e2y;
      const ny = e1z * e2x - e1x * e2z;
      const nz = e1x * e2y - e1y * e2x;
      const len = Math.hypot(nx, ny, nz);
      if (len < 1e-9 || isNaN(len)) continue;
      const invLen = 1 / len;
      const normX = nx * invLen;
      const normY = ny * invLen;
      const normZ = nz * invLen;

      // Perspective backface culling: vector from triangle centroid to camera
      const cx_pt = (t0[0] + t1[0] + t2[0]) * 0.33333333;
      const cy_pt = (t0[1] + t1[1] + t2[1]) * 0.33333333;
      const cz_pt = (t0[2] + t1[2] + t2[2]) * 0.33333333;
      const toCamX = -cx_pt;
      const toCamY = -cy_pt;
      const toCamZ = cameraDist - cz_pt;

      const isFrontFacing = (normX * toCamX + normY * toCamY + normZ * toCamZ) > 0;

      if (doCulling && !isFrontFacing) {
        continue;
      }

      // Average depth (Z in camera space: larger = farther from camera lens)
      const avgZ = (p0.z + p1.z + p2.z) * 0.33333333;

      // Lambertian diffuse lighting
      const nDotL = normX * lx + normY * ly + normZ * lz;
      const diffuse = Math.max(0, nDotL);

      // Populate preallocated pool item
      const item = this.trianglesPool[renderableCount++];
      item.i0 = i0;
      item.i1 = i1;
      item.i2 = i2;
      item.p0 = p0;
      item.p1 = p1;
      item.p2 = p2;
      item.avgZ = avgZ;
      item.diffuse = diffuse;
      item.isFrontFacing = isFrontFacing;
    }

    // Populate renderableTriangles buffer with active pool items
    this.renderableTriangles.length = renderableCount;
    for (let i = 0; i < renderableCount; i++) {
      this.renderableTriangles[i] = this.trianglesPool[i];
    }

    // Sort triangles back-to-front (Painter's algorithm: largest avgZ first)
    this.renderableTriangles.sort((a, b) => b.avgZ - a.avgZ);

    // 4. Render Polygons (Faces)
    if (this.options.showFaces) {
      this.renderFaces(this.renderableTriangles);
    }

    // 5. Render Wireframe (Triangle edges)
    if (this.options.showWireframe) {
      this.renderWireframe(this.renderableTriangles, theme);
    }

    // 6. Render Points (Vertices)
    if (this.options.showPoints) {
      this.renderPoints(theme);
    }
  }

  /**
   * Draw stylish background with radial glow centered on canvas
   */
  drawBackground(theme) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, w, h);

    // Centered ambient radial glow
    const outerRadius = Math.max(20, Math.max(w, h) * 0.7);
    const grad = ctx.createRadialGradient(
      w * 0.5, h * 0.5, 10,
      w * 0.5, h * 0.5, outerRadius
    );
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.025)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.4)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  /**
   * Draw subtle 100vmin square framing guide with cyber corner brackets
   */
  drawFrameGuide(theme, vmin, halfW, halfH) {
    const ctx = this.ctx;
    const size = vmin * 0.98; // 100vmin frame with subtle 1% safety margin
    const halfSize = size * 0.5;
    const left = halfW - halfSize;
    const top = halfH - halfSize;

    ctx.save();

    // Dotted square outline
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.strokeRect(left, top, size, size);

    // Solid cyber corner brackets
    ctx.setLineDash([]);
    ctx.strokeStyle = theme.wireGlow || 'rgba(0, 240, 255, 0.45)';
    ctx.lineWidth = 2;
    const cLen = Math.min(24, size * 0.06);

    // Top-Left corner
    ctx.beginPath();
    ctx.moveTo(left, top + cLen);
    ctx.lineTo(left, top);
    ctx.lineTo(left + cLen, top);

    // Top-Right corner
    ctx.moveTo(left + size - cLen, top);
    ctx.lineTo(left + size, top);
    ctx.lineTo(left + size, top + cLen);

    // Bottom-Left corner
    ctx.moveTo(left, top + size - cLen);
    ctx.lineTo(left, top + size);
    ctx.lineTo(left + cLen, top + size);

    // Bottom-Right corner
    ctx.moveTo(left + size - cLen, top + size);
    ctx.lineTo(left + size, top + size);
    ctx.lineTo(left + size, top + size - cLen);
    ctx.stroke();

    // Subtle central crosshair
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(halfW - 8, halfH);
    ctx.lineTo(halfW + 8, halfH);
    ctx.moveTo(halfW, halfH - 8);
    ctx.lineTo(halfW, halfH + 8);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Render depth-sorted triangular polygons with dynamic lighting using cached color palette
   * Eliminates all string allocations in the face rendering loop!
   */
  renderFaces(triangles) {
    const ctx = this.ctx;
    const ambient = this.options.ambientLight;
    const lightInt = this.options.lightIntensity;
    const frontPalette = this.frontColorPalette;
    const backPalette = this.backColorPalette;
    const count = triangles.length;

    for (let i = 0; i < count; i++) {
      const tri = triangles[i];
      const p0 = tri.p0;
      const p1 = tri.p1;
      const p2 = tri.p2;

      // Calculate lit shade index [0..255]
      const lightFactor = ambient + (1 - ambient) * tri.diffuse * lightInt;
      const shadeIdx = Math.min(255, Math.max(0, (lightFactor * 255) | 0));

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.closePath();

      ctx.fillStyle = tri.isFrontFacing ? frontPalette[shadeIdx] : backPalette[shadeIdx];
      ctx.fill();
    }
  }

  /**
   * Render wireframe edges
   * When backface culling is off, uses precomputed unique edge list to eliminate 50% duplicate lines!
   */
  renderWireframe(triangles, theme) {
    const ctx = this.ctx;
    ctx.save();
    ctx.lineWidth = this.options.lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (this.options.glowEffect) {
      ctx.shadowBlur = 4;
      ctx.shadowColor = theme.wireGlow;
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.strokeStyle = theme.wireColor;
    ctx.beginPath();

    if (!this.options.backfaceCulling && this.faceData.edges) {
      // 100% deduplicated rendering: draw each unique edge exactly once
      const edges = this.faceData.edges;
      const eCount = edges.length;
      for (let i = 0; i < eCount; i++) {
        const e = edges[i];
        const p0 = this.projectedVertices[e[0]];
        const p1 = this.projectedVertices[e[1]];
        if (!p0.visible || !p1.visible) continue;

        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
      }
    } else {
      // Backface culling active: draw visible triangle contours
      const count = triangles.length;
      for (let i = 0; i < count; i++) {
        const tri = triangles[i];
        const p0 = tri.p0;
        const p1 = tri.p1;
        const p2 = tri.p2;

        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p0.x, p0.y);
      }
    }

    ctx.stroke();
    ctx.restore();
  }

  /**
   * Render points (vertices) with depth scaling and feature highlighting
   * Direct two-pass rendering: ZERO temporary arrays or point objects allocated!
   */
  renderPoints(theme) {
    const ctx = this.ctx;
    const baseRadius = this.options.pointSize;
    const vCount = this.faceData.vertexCount;
    const projected = this.projectedVertices;
    const features = this.featureIndices;

    ctx.save();

    // Pass 1: Draw normal vertices in one batched path
    if (this.options.glowEffect) {
      ctx.shadowBlur = 6;
      ctx.shadowColor = theme.pointGlow;
    }
    ctx.fillStyle = theme.pointColor;
    ctx.beginPath();

    for (let i = 0; i < vCount; i++) {
      if (features.has(i)) continue;
      const p = projected[i];
      if (!p.visible) continue;

      // Depth attenuation: points closer to camera lens (smaller z) are slightly larger
      const depthScale = Math.max(0.6, Math.min(1.5, 4.2 / p.z));
      const radius = baseRadius * depthScale;

      ctx.moveTo(p.x + radius, p.y);
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    }
    ctx.fill();

    // Pass 2: Draw feature vertices (eyes, lips, contour) with distinct accent glow
    const featList = this.featureIndicesList;
    const fCount = featList.length;

    if (fCount > 0) {
      ctx.fillStyle = theme.featurePointColor;
      if (this.options.glowEffect) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = theme.featurePointColor;
      }
      ctx.beginPath();

      for (let i = 0; i < fCount; i++) {
        const p = projected[featList[i]];
        if (!p.visible) continue;

        const depthScale = Math.max(0.6, Math.min(1.5, 4.2 / p.z));
        const radius = baseRadius * depthScale * 1.25;

        ctx.moveTo(p.x + radius, p.y);
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    ctx.restore();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FaceRenderer;
}
