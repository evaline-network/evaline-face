/**
 * Eva Face - Minimalist 3D Genesis Animation Controller
 * Pure Vanilla JavaScript & HTML5 Canvas 3D Engine
 */

class EvaFaceAnimation {
  constructor(canvas, data) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.data = data;

    // Viewport & DPI
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Color Themes
    this.themes = {
      cyan: {
        id: 'cyan',
        name: 'Ethereal Cyan',
        bg: '#03050c',
        bgGrad: ['#080f22', '#020307'],
        wire: 'rgba(0, 235, 255, 0.65)',
        wireGlow: 'rgba(0, 235, 255, 0.95)',
        wireDim: 'rgba(0, 160, 210, 0.22)',
        point: '#00ffff',
        pointGlow: 'rgba(0, 255, 255, 0.85)',
        faceBase: [0, 45, 95],
        faceHighlight: [0, 240, 255],
        accent: '#ff007f',
        accentGlow: 'rgba(255, 0, 127, 0.9)',
        hudText: '#7ce8ff'
      },
      rose: {
        id: 'rose',
        name: 'Rose Quartz',
        bg: '#0a0307',
        bgGrad: ['#1d0714', '#040103'],
        wire: 'rgba(255, 95, 160, 0.68)',
        wireGlow: 'rgba(255, 110, 175, 0.95)',
        wireDim: 'rgba(180, 50, 100, 0.22)',
        point: '#ff77b4',
        pointGlow: 'rgba(255, 119, 180, 0.85)',
        faceBase: [75, 15, 45],
        faceHighlight: [255, 140, 195],
        accent: '#00ffff',
        accentGlow: 'rgba(0, 255, 255, 0.9)',
        hudText: '#ffb3d9'
      },
      emerald: {
        id: 'emerald',
        name: 'Matrix Emerald',
        bg: '#020905',
        bgGrad: ['#051a0d', '#010502'],
        wire: 'rgba(0, 255, 140, 0.65)',
        wireGlow: 'rgba(0, 255, 150, 0.95)',
        wireDim: 'rgba(0, 140, 75, 0.22)',
        point: '#00ff8c',
        pointGlow: 'rgba(0, 255, 140, 0.85)',
        faceBase: [5, 55, 30],
        faceHighlight: [60, 255, 170],
        accent: '#ffdd00',
        accentGlow: 'rgba(255, 221, 0, 0.9)',
        hudText: '#85ffc7'
      },
      silver: {
        id: 'silver',
        name: 'Titanium White',
        bg: '#050608',
        bgGrad: ['#11141c', '#030405'],
        wire: 'rgba(220, 230, 245, 0.65)',
        wireGlow: 'rgba(255, 255, 255, 0.95)',
        wireDim: 'rgba(130, 145, 170, 0.22)',
        point: '#ffffff',
        pointGlow: 'rgba(255, 255, 255, 0.85)',
        faceBase: [30, 38, 52],
        faceHighlight: [220, 235, 255],
        accent: '#70b5ff',
        accentGlow: 'rgba(112, 181, 255, 0.9)',
        hudText: '#cbd5e1'
      }
    };
    this.currentThemeKey = 'cyan';
    this.theme = this.themes.cyan;

    // Timeline Configuration (Seconds)
    this.TIMELINE = {
      VOID_END: 1.5,
      P1_APPEAR: 2.2,
      P2_APPEAR: 3.4,
      LINE12_END: 4.0,
      P3_APPEAR: 4.8,
      TRIANGLE_FORMED: 6.2,
      SPHERE_START: 6.5,
      SPHERE_COMPLETE: 12.0,
      MORPH_START: 12.4,
      MORPH_COMPLETE: 17.0
    };
    this.totalDuration = 18.0;

    // Playback state
    this.currentTime = 0;
    this.isPlaying = true;
    this.playbackSpeed = 1.0;
    this.autoRotate = true;

    // Camera & Orbit Controls
    this.yaw = 0;
    this.pitch = 0;
    this.targetYaw = 0;
    this.targetPitch = 0;
    this.cameraDist = 3.6;
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;

    // Interaction state
    this.isDragging = false;
    this.isPanning = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    // Preallocated buffers
    const vCount = this.data.vertexCount;
    this.currentVertices = new Array(vCount);
    this.transformedVertices = new Array(vCount);
    this.projectedVertices = new Array(vCount);

    for (let i = 0; i < vCount; i++) {
      this.currentVertices[i] = [0, 0, 0];
      this.transformedVertices[i] = [0, 0, 0];
      this.projectedVertices[i] = { x: 0, y: 0, z: 0, scale: 0, visible: false };
    }

    // Precompute feature sets & edges
    this.featureVerticesSet = new Set();
    this.featureEdges = [];
    if (this.data.features) {
      const groupSets = {};
      for (const [name, list] of Object.entries(this.data.features)) {
        if (name === 'contour') continue;
        groupSets[name] = new Set(list);
        list.forEach(v => this.featureVerticesSet.add(v));
      }

      this.data.edges.forEach(([a, b]) => {
        for (const [name, set] of Object.entries(groupSets)) {
          if (set.has(a) && set.has(b)) {
            this.featureEdges.push([a, b]);
            break;
          }
        }
      });
    }

    // Morph delays per vertex for wave from center outward
    this.vertexMorphDelays = new Float32Array(vCount);
    const pCenter = this.data.sphereVertices[this.data.initialTriangle[0]];
    for (let i = 0; i < vCount; i++) {
      const sv = this.data.sphereVertices[i];
      const dist = Math.hypot(sv[0] - pCenter[0], sv[1] - pCenter[1], sv[2] - pCenter[2]);
      this.vertexMorphDelays[i] = Math.min(0.35, dist * 0.2);
    }

    // Ambient floating particles
    this.particles = [];
    for (let i = 0; i < 45; i++) {
      this.particles.push({
        x: (Math.random() - 0.5) * 3.5,
        y: (Math.random() - 0.5) * 3.5,
        z: (Math.random() - 0.5) * 3.5,
        size: Math.random() * 1.5 + 0.8,
        speed: Math.random() * 0.2 + 0.1,
        phase: Math.random() * Math.PI * 2
      });
    }

    // Triangle pool for zero-garbage depth sorting
    this.trianglesPool = new Array(this.data.triangleCount);
    for (let i = 0; i < this.data.triangleCount; i++) {
      this.trianglesPool[i] = {
        i0: 0, i1: 0, i2: 0,
        p0: null, p1: null, p2: null,
        avgZ: 0,
        normZ: 0
      };
    }

    this.initEvents();
    this.resize();

    this.onProgressUpdate = null;
    this.onStageChange = null;
    this.currentStage = -1;
  }

  setTheme(key) {
    if (this.themes[key]) {
      this.currentThemeKey = key;
      this.theme = this.themes[key];
    }
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  initEvents() {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isDragging = true;
      } else if (e.button === 2) {
        this.isPanning = true;
      }
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging && !this.isPanning) return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      if (this.isDragging) {
        this.targetYaw += dx * 0.007;
        this.targetPitch += dy * 0.007;
        this.targetPitch = Math.max(-1.4, Math.min(1.4, this.targetPitch));
      } else if (this.isPanning) {
        this.panX += dx * 0.002;
        this.panY += dy * 0.002;
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.isPanning = false;
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      this.zoom = Math.max(0.4, Math.min(3.0, this.zoom * zoomFactor));
    }, { passive: false });

    // Touch controls
    let touchStartDist = 0;
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        this.isDragging = false;
        touchStartDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.isDragging) {
        const dx = e.touches[0].clientX - this.lastMouseX;
        const dy = e.touches[0].clientY - this.lastMouseY;
        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
        this.targetYaw += dx * 0.008;
        this.targetPitch += dy * 0.008;
        this.targetPitch = Math.max(-1.4, Math.min(1.4, this.targetPitch));
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (touchStartDist > 0) {
          const factor = dist / touchStartDist;
          this.zoom = Math.max(0.4, Math.min(3.0, this.zoom * (factor > 1 ? 1.03 : 0.97)));
        }
        touchStartDist = dist;
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', () => {
      this.isDragging = false;
      touchStartDist = 0;
    });
  }

  jumpToStage(stageIndex) {
    switch (stageIndex) {
      case 0:
        this.currentTime = 0;
        break;
      case 1:
        this.currentTime = 1.6;
        break;
      case 2:
        this.currentTime = 5.6;
        break;
      case 3:
        this.currentTime = 8.0;
        break;
      case 4:
        this.currentTime = 17.1;
        break;
    }
  }

  seek(time) {
    this.currentTime = Math.max(0, Math.min(this.totalDuration, time));
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    return this.isPlaying;
  }

  replay() {
    this.currentTime = 0;
    this.isPlaying = true;
    this.targetYaw = 0;
    this.targetPitch = 0;
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1.0;
  }

  update(deltaSeconds) {
    if (this.isPlaying) {
      this.currentTime += deltaSeconds * this.playbackSpeed;
      if (this.currentTime > this.totalDuration) {
        this.currentTime = this.totalDuration + 0.001;
      }
    }

    // Camera damping
    this.yaw += (this.targetYaw - this.yaw) * 0.12;
    this.pitch += (this.targetPitch - this.pitch) * 0.12;

    // Subtle automatic 3D orbital motion
    if (this.autoRotate) {
      if (this.currentTime >= this.TIMELINE.TRIANGLE_FORMED && this.currentTime < this.TIMELINE.SPHERE_START) {
        this.targetYaw += deltaSeconds * 0.2;
      } else if (this.currentTime >= this.TIMELINE.SPHERE_START && this.currentTime < this.TIMELINE.MORPH_START) {
        this.targetYaw += deltaSeconds * 0.4;
      } else if (this.currentTime >= this.TIMELINE.MORPH_START) {
        this.targetYaw += deltaSeconds * 0.15;
      }
    }

    let stage = 0;
    if (this.currentTime < this.TIMELINE.VOID_END) stage = 0;
    else if (this.currentTime < this.TIMELINE.TRIANGLE_FORMED) stage = 1;
    else if (this.currentTime < this.TIMELINE.SPHERE_COMPLETE) stage = 2;
    else if (this.currentTime < this.TIMELINE.MORPH_COMPLETE) stage = 3;
    else stage = 4;

    if (stage !== this.currentStage) {
      this.currentStage = stage;
      if (this.onStageChange) this.onStageChange(stage);
    }

    if (this.onProgressUpdate) {
      this.onProgressUpdate(this.currentTime, this.totalDuration, stage);
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const vmin = Math.min(w, h);
    const halfW = w * 0.5;
    const halfH = h * 0.5;
    const t = this.currentTime;
    const theme = this.theme;

    // 1. Clear background
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, w, h);

    const bgGrad = ctx.createRadialGradient(halfW, halfH, vmin * 0.1, halfW, halfH, vmin * 0.95);
    bgGrad.addColorStop(0, theme.bgGrad[0]);
    bgGrad.addColorStop(1, theme.bgGrad[1]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Ambient particles
    this.renderParticles(ctx, halfW, halfH, vmin);

    // Phase 0: Void
    if (t < this.TIMELINE.VOID_END) {
      this.renderVoidGenesis(ctx, halfW, halfH, vmin, t);
      return;
    }

    // Camera matrix
    let yaw = this.yaw;
    let pitch = this.pitch;
    if (t >= this.TIMELINE.MORPH_COMPLETE) {
      const breathTime = t - this.TIMELINE.MORPH_COMPLETE;
      yaw += Math.sin(breathTime * 0.7) * 0.025;
      pitch += Math.cos(breathTime * 0.5) * 0.015;
    }
    const rotM = Math3D.mat3FromEuler(yaw, pitch, 0);

    // Dynamic cinematic zoom: starts close-up on the first points & triangle, then pulls back as the sphere grows
    let autoZoom = 1.0;
    if (t < this.TIMELINE.TRIANGLE_FORMED) {
      autoZoom = 2.5;
    } else if (t < this.TIMELINE.SPHERE_START + 2.2) {
      const zp = (t - this.TIMELINE.TRIANGLE_FORMED) / (this.TIMELINE.SPHERE_START + 2.2 - this.TIMELINE.TRIANGLE_FORMED);
      autoZoom = 2.5 - 1.5 * Math3D.easeInOutCubic(Math.min(1, Math.max(0, zp)));
    }

    const fov = vmin * 1.65 * this.zoom * autoZoom;
    const camDist = this.cameraDist;

    // 3. Current geometry
    this.computeCurrentGeometry(t);

    // 4. Transform & project
    const vCount = this.data.vertexCount;
    for (let i = 0; i < vCount; i++) {
      const pos = this.currentVertices[i];
      Math3D.transformVec3Out(rotM, pos, this.transformedVertices[i]);

      const tv = this.transformedVertices[i];
      const pz = tv[2] + camDist;

      if (pz > 0.2) {
        const invZ = 1.0 / pz;
        const screenScale = fov * invZ;
        const sx = halfW + (tv[0] + this.panX) * screenScale;
        const sy = halfH - (tv[1] + this.panY) * screenScale;

        const proj = this.projectedVertices[i];
        proj.x = sx;
        proj.y = sy;
        proj.z = pz;
        proj.scale = screenScale;
        proj.visible = true;
      } else {
        this.projectedVertices[i].visible = false;
      }
    }

    // 5. Render active geometry
    if (t < this.TIMELINE.TRIANGLE_FORMED) {
      this.renderStage1InitialGenesis(ctx, t, halfW, halfH);
    } else if (t < this.TIMELINE.SPHERE_START) {
      this.renderStage1CompleteTriangle(ctx, t);
    } else {
      this.renderStageMesh(ctx, t, rotM);
    }
  }

  computeCurrentGeometry(t) {
    const vCount = this.data.vertexCount;
    const sv = this.data.sphereVertices;
    const fv = this.data.faceVertices;

    if (t < this.TIMELINE.MORPH_START) {
      for (let i = 0; i < vCount; i++) {
        this.currentVertices[i][0] = sv[i][0];
        this.currentVertices[i][1] = sv[i][1];
        this.currentVertices[i][2] = sv[i][2];
      }
    } else if (t >= this.TIMELINE.MORPH_COMPLETE) {
      const breathTime = t - this.TIMELINE.MORPH_COMPLETE;
      const breath = 1.0 + Math.sin(breathTime * 1.5) * 0.012;
      for (let i = 0; i < vCount; i++) {
        this.currentVertices[i][0] = fv[i][0] * breath;
        this.currentVertices[i][1] = fv[i][1] * breath;
        this.currentVertices[i][2] = fv[i][2] * breath;
      }
    } else {
      const morphProgress = (t - this.TIMELINE.MORPH_START) / (this.TIMELINE.MORPH_COMPLETE - this.TIMELINE.MORPH_START);
      for (let i = 0; i < vCount; i++) {
        const delay = this.vertexMorphDelays[i];
        const localT = Math.max(0, Math.min(1, (morphProgress - delay) / (1.0 - delay)));
        const easedT = Math3D.easeInOutCubic(localT);

        this.currentVertices[i][0] = sv[i][0] + (fv[i][0] - sv[i][0]) * easedT;
        this.currentVertices[i][1] = sv[i][1] + (fv[i][1] - sv[i][1]) * easedT;
        this.currentVertices[i][2] = sv[i][2] + (fv[i][2] - sv[i][2]) * easedT;
      }
    }
  }

  renderVoidGenesis(ctx, halfW, halfH, vmin, t) {
    const normT = t / this.TIMELINE.VOID_END;
    const pulse = Math.sin(normT * Math.PI) * 0.5 + 0.5;

    const r = vmin * 0.008 * (1.0 + pulse * 0.4);
    const grad = ctx.createRadialGradient(halfW, halfH, 0, halfW, halfH, vmin * 0.08);
    grad.addColorStop(0, this.theme.pointGlow);
    grad.addColorStop(0.3, 'rgba(0, 240, 255, 0.2)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(halfW, halfH, vmin * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.theme.point;
    ctx.beginPath();
    ctx.arc(halfW, halfH, r, 0, Math.PI * 2);
    ctx.fill();
  }

  renderStage1InitialGenesis(ctx, t, halfW, halfH) {
    const initPts = this.data.initialPoints;
    const p1 = this.projectedVertices[initPts[0]];
    const p2 = this.projectedVertices[initPts[1]];
    const p3 = this.projectedVertices[initPts[2]];

    if (!p1.visible || !p2.visible || !p3.visible) return;

    if (t >= this.TIMELINE.P1_APPEAR) {
      const p1Age = t - this.TIMELINE.P1_APPEAR;
      this.drawLuminousNode(ctx, p1.x, p1.y, p1Age, '01');
    }

    if (t >= this.TIMELINE.P2_APPEAR) {
      const p2Age = t - this.TIMELINE.P2_APPEAR;
      this.drawLuminousNode(ctx, p2.x, p2.y, p2Age, '02');

      const lineProgress = Math.min(1.0, (t - this.TIMELINE.P2_APPEAR) / (this.TIMELINE.LINE12_END - this.TIMELINE.P2_APPEAR));
      this.drawProgressiveLine(ctx, p1, p2, lineProgress);
    }

    if (t >= this.TIMELINE.P3_APPEAR) {
      const p3Age = t - this.TIMELINE.P3_APPEAR;
      this.drawLuminousNode(ctx, p3.x, p3.y, p3Age, '03');

      const lineProgress23 = Math.min(1.0, (t - this.TIMELINE.P3_APPEAR) / 0.7);
      this.drawProgressiveLine(ctx, p2, p3, lineProgress23);
      this.drawProgressiveLine(ctx, p3, p1, lineProgress23);

      if (lineProgress23 >= 0.8) {
        const fillAlpha = Math.min(0.45, (lineProgress23 - 0.8) * 2.2);
        ctx.fillStyle = `rgba(${this.theme.faceHighlight.join(',')}, ${fillAlpha})`;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  renderStage1CompleteTriangle(ctx, t) {
    const initPts = this.data.initialPoints;
    const p1 = this.projectedVertices[initPts[0]];
    const p2 = this.projectedVertices[initPts[1]];
    const p3 = this.projectedVertices[initPts[2]];
    if (!p1.visible || !p2.visible || !p3.visible) return;

    const pulse = Math.sin((t - this.TIMELINE.TRIANGLE_FORMED) * 4) * 0.1 + 0.45;
    ctx.fillStyle = `rgba(${this.theme.faceHighlight.join(',')}, ${pulse})`;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = this.theme.wireGlow;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.stroke();

    this.drawLuminousNode(ctx, p1.x, p1.y, 1.0, '01');
    this.drawLuminousNode(ctx, p2.x, p2.y, 1.0, '02');
    this.drawLuminousNode(ctx, p3.x, p3.y, 1.0, '03');
  }

  renderStageMesh(ctx, t, rotM) {
    const totalTriangles = this.data.triangleCount;
    let activeTriCount = totalTriangles;

    if (t < this.TIMELINE.SPHERE_COMPLETE) {
      const sphereProgress = (t - this.TIMELINE.SPHERE_START) / (this.TIMELINE.SPHERE_COMPLETE - this.TIMELINE.SPHERE_START);
      const easedProgress = Math3D.easeOutQuad(Math.max(0, Math.min(1, sphereProgress)));
      activeTriCount = Math.max(1, Math.min(totalTriangles, Math.floor(totalTriangles * easedProgress)));
    }

    const renderTriangles = [];
    for (let i = 0; i < activeTriCount; i++) {
      const tri = this.data.triangles[i];
      const p0 = this.projectedVertices[tri[0]];
      const p1 = this.projectedVertices[tri[1]];
      const p2 = this.projectedVertices[tri[2]];

      if (p0.visible && p1.visible && p2.visible) {
        const poolItem = this.trianglesPool[i];
        poolItem.i0 = tri[0];
        poolItem.i1 = tri[1];
        poolItem.i2 = tri[2];
        poolItem.p0 = p0;
        poolItem.p1 = p1;
        poolItem.p2 = p2;
        poolItem.avgZ = (p0.z + p1.z + p2.z) * 0.333333;

        const cross = (p1.x - p0.x) * (p2.y - p0.y) - (p1.y - p0.y) * (p2.x - p0.x);
        poolItem.normZ = cross;
        renderTriangles.push(poolItem);
      }
    }

    renderTriangles.sort((a, b) => b.avgZ - a.avgZ);

    const baseRGB = this.theme.faceBase;
    const highRGB = this.theme.faceHighlight;
    const isFaceStage = t >= this.TIMELINE.MORPH_START;

    // Translucent polygon fills
    for (let i = 0; i < renderTriangles.length; i++) {
      const tri = renderTriangles[i];
      const isFront = tri.normZ > 0;
      const alpha = isFront ? (isFaceStage ? 0.32 : 0.2) : 0.07;

      const r = isFront ? highRGB[0] : baseRGB[0];
      const g = isFront ? highRGB[1] : baseRGB[1];
      const b = isFront ? highRGB[2] : baseRGB[2];

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(tri.p0.x, tri.p0.y);
      ctx.lineTo(tri.p1.x, tri.p1.y);
      ctx.lineTo(tri.p2.x, tri.p2.y);
      ctx.closePath();
      ctx.fill();
    }

    // Wireframe edges
    const totalEdges = this.data.edges.length;
    let activeEdgeCount = totalEdges;
    if (t < this.TIMELINE.SPHERE_COMPLETE) {
      const sphereProgress = (t - this.TIMELINE.SPHERE_START) / (this.TIMELINE.SPHERE_COMPLETE - this.TIMELINE.SPHERE_START);
      activeEdgeCount = Math.max(3, Math.min(totalEdges, Math.floor(totalEdges * Math3D.easeOutQuad(sphereProgress))));
    }

    ctx.lineWidth = isFaceStage ? 0.85 : 0.7;
    ctx.strokeStyle = this.theme.wire;
    ctx.beginPath();
    for (let i = 0; i < activeEdgeCount; i++) {
      const e = this.data.edges[i];
      const p0 = this.projectedVertices[e[0]];
      const p1 = this.projectedVertices[e[1]];
      if (p0.visible && p1.visible) {
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
      }
    }
    ctx.stroke();

    // Nodes (Points)
    let activeVertexCount = this.data.vertexCount;
    if (t < this.TIMELINE.SPHERE_COMPLETE) {
      const sphereProgress = (t - this.TIMELINE.SPHERE_START) / (this.TIMELINE.SPHERE_COMPLETE - this.TIMELINE.SPHERE_START);
      activeVertexCount = Math.max(3, Math.min(this.data.vertexCount, Math.floor(this.data.vertexCount * Math3D.easeOutQuad(sphereProgress))));
    }

    ctx.fillStyle = this.theme.point;
    for (let i = 0; i < activeVertexCount; i++) {
      const vIdx = this.data.vertexOrder[i];
      const p = this.projectedVertices[vIdx];
      if (p.visible && p.z < this.cameraDist) {
        ctx.beginPath();
        const ptSize = Math.max(1.0, Math.min(2.4, p.scale * 0.0035));
        ctx.arc(p.x, p.y, ptSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Anatomical feature landmark illumination
    if (t >= this.TIMELINE.MORPH_COMPLETE) {
      this.renderFacialLandmarks(ctx, t);
    }
  }

  renderFacialLandmarks(ctx, t) {
    const pulse = Math.sin((t - this.TIMELINE.MORPH_COMPLETE) * 2.2) * 0.2 + 0.8;
    ctx.strokeStyle = this.theme.accent;
    ctx.lineWidth = 1.4;
    ctx.shadowColor = this.theme.accentGlow;
    ctx.shadowBlur = 8;

    // Draw landmark edges
    ctx.beginPath();
    for (let i = 0; i < this.featureEdges.length; i++) {
      const e = this.featureEdges[i];
      const p0 = this.projectedVertices[e[0]];
      const p1 = this.projectedVertices[e[1]];
      if (p0.visible && p1.visible && p0.z < this.cameraDist + 0.1 && p1.z < this.cameraDist + 0.1) {
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Accent glowing feature nodes
    ctx.fillStyle = this.theme.accent;
    this.featureVerticesSet.forEach(vIdx => {
      const p = this.projectedVertices[vIdx];
      if (p && p.visible && p.z < this.cameraDist) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.0 * pulse, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  drawLuminousNode(ctx, x, y, age, label) {
    const pulse = Math.sin(age * 6) * 0.3 + 0.7;
    const baseRadius = 3.5;

    const grad = ctx.createRadialGradient(x, y, 0, x, y, 16);
    grad.addColorStop(0, this.theme.pointGlow);
    grad.addColorStop(0.4, this.theme.wireGlow);
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, baseRadius * pulse, 0, Math.PI * 2);
    ctx.fill();

    if (age < 0.8) {
      const ringRadius = age * 36;
      const ringAlpha = Math.max(0, 1.0 - age / 0.8);
      ctx.strokeStyle = `rgba(0, 255, 255, ${ringAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (label) {
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.fillStyle = this.theme.hudText;
      ctx.fillText(`• NODE ${label}`, x + 8, y - 6);
    }
  }

  drawProgressiveLine(ctx, p1, p2, progress) {
    const curX = p1.x + (p2.x - p1.x) * progress;
    const curY = p1.y + (p2.y - p1.y) * progress;

    ctx.strokeStyle = this.theme.wireGlow;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(curX, curY);
    ctx.stroke();

    if (progress > 0.02 && progress < 0.98) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(curX, curY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderParticles(ctx, halfW, halfH, vmin) {
    const t = this.currentTime;
    ctx.fillStyle = this.theme.hudText;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const yOffset = Math.sin(t * p.speed + p.phase) * 0.15;
      const px = halfW + p.x * vmin * 0.55;
      const py = halfH + (p.y + yOffset) * vmin * 0.55;
      const alpha = (Math.sin(t * 0.8 + p.phase) * 0.3 + 0.4) * 0.45;

      ctx.fillStyle = `rgba(200, 230, 255, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EvaFaceAnimation;
}
