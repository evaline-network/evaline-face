/**
 * Interactive 3D Camera & Orbit Controls
 * Supports mouse drag, touch gestures, pinch-to-zoom, pan, damping inertia, and auto-rotation.
 */

class OrbitControls {
  constructor(canvas, onUpdate = null) {
    this.canvas = canvas;
    this.onUpdate = onUpdate;

    // Rotation angles (Euler in radians)
    this.rotX = 0.05; // Slight initial tilt
    this.rotY = 0.0;
    this.rotZ = 0.0;

    // Velocities for inertia
    this.velX = 0;
    this.velY = 0;
    this.damping = 0.92;

    // Zoom & Pan
    this.zoom = 1.0;
    this.targetZoom = 1.0;
    this.minZoom = 0.35;
    this.maxZoom = 3.5;

    this.panX = 0;
    this.panY = 0;
    this.targetPanX = 0;
    this.targetPanY = 0;

    // Auto-rotation
    this.autoRotate = true;
    this.autoRotateSpeed = 0.007;

    // State tracking
    this.isDragging = false;
    this.isPanning = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    // Preallocated rotation matrix buffer to eliminate allocations
    this.rotMatrix = new Float32Array(9);

    // Bound event listener references for leak-free add/remove
    this._onMouseDown = (e) => this.onMouseDown(e);
    this._onMouseMove = (e) => this.onMouseMove(e);
    this._onMouseUp = () => this.onMouseUp();
    this._onWheel = (e) => this.onWheel(e);
    this._onDblClick = () => this.resetView();
    this._onContextMenu = (e) => e.preventDefault();
    this._onTouchStart = (e) => this.onTouchStart(e);
    this._onTouchMove = (e) => this.onTouchMove(e);
    this._onTouchEnd = () => this.onTouchEnd();
    this._onKeyDown = (e) => this.onKeyDown(e);

    this.initEvents();
  }

  initEvents() {
    const el = this.canvas;

    // Mouse events
    el.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup', this._onMouseUp);
    el.addEventListener('wheel', this._onWheel, { passive: false });
    el.addEventListener('dblclick', this._onDblClick);
    el.addEventListener('contextmenu', this._onContextMenu);

    // Touch events for mobile
    el.addEventListener('touchstart', this._onTouchStart, { passive: false });
    window.addEventListener('touchmove', this._onTouchMove, { passive: false });
    window.addEventListener('touchend', this._onTouchEnd);
    window.addEventListener('touchcancel', this._onTouchEnd);

    // Keyboard controls
    window.addEventListener('keydown', this._onKeyDown);
  }

  /**
   * Remove all event listeners and release references
   */
  destroy() {
    const el = this.canvas;
    if (el) {
      el.removeEventListener('mousedown', this._onMouseDown);
      el.removeEventListener('wheel', this._onWheel);
      el.removeEventListener('dblclick', this._onDblClick);
      el.removeEventListener('contextmenu', this._onContextMenu);
      el.removeEventListener('touchstart', this._onTouchStart);
    }
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('touchmove', this._onTouchMove);
    window.removeEventListener('touchend', this._onTouchEnd);
    window.removeEventListener('touchcancel', this._onTouchEnd);
    window.removeEventListener('keydown', this._onKeyDown);
  }

  onMouseDown(e) {
    this.isDragging = true;
    this.isPanning = false;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.velX = 0;
    this.velY = 0;
  }

  onMouseMove(e) {
    if (!this.isDragging) return;

    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    const rotSpeed = 0.0065;
    this.velY = dx * rotSpeed;
    this.velX = dy * rotSpeed;
    this.rotY += this.velY;
    this.rotX += this.velX;

    // Limit pitch to prevent upside-down flip
    this.rotX = Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, this.rotX));
  }

  onMouseUp() {
    this.isDragging = false;
    this.isPanning = false;
  }

  onWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.909;
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetZoom * zoomFactor));
  }

  onTouchStart(e) {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
      this.velX = 0;
      this.velY = 0;
    } else if (e.touches.length === 2) {
      this.isDragging = false;
      this.lastTouchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  }

  onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging) {
      const dx = e.touches[0].clientX - this.lastMouseX;
      const dy = e.touches[0].clientY - this.lastMouseY;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;

      const rotSpeed = 0.007;
      this.velY = dx * rotSpeed;
      this.velX = dy * rotSpeed;
      this.rotY += this.velY;
      this.rotX += this.velX;
      this.rotX = Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, this.rotX));
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (dist > 5 && this.lastTouchDist > 5) {
        const factor = dist / this.lastTouchDist;
        this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetZoom * factor));
      }
      this.lastTouchDist = dist;
    }
  }

  onTouchEnd() {
    this.isDragging = false;
    this.lastTouchDist = 0;
  }

  onKeyDown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        this.autoRotate = !this.autoRotate;
        if (this.onUpdate) this.onUpdate('autoRotate', this.autoRotate);
        break;
      case 'KeyR':
        this.resetView();
        break;
      case 'ArrowLeft':
        this.rotY -= 0.05;
        break;
      case 'ArrowRight':
        this.rotY += 0.05;
        break;
      case 'ArrowUp':
        this.rotX -= 0.05;
        break;
      case 'ArrowDown':
        this.rotX += 0.05;
        break;
      case 'Equal':
      case 'NumpadAdd':
        this.targetZoom = Math.min(this.maxZoom, this.targetZoom * 1.15);
        break;
      case 'Minus':
      case 'NumpadSubtract':
        this.targetZoom = Math.max(this.minZoom, this.targetZoom * 0.85);
        break;
    }
  }

  resetView() {
    this.rotX = 0.05;
    this.rotY = 0.0;
    this.rotZ = 0.0;
    this.velX = 0;
    this.velY = 0;
    this.targetZoom = 1.0;
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.targetPanX = 0;
    this.targetPanY = 0;
  }

  update(delta = 0.016) {
    // Smooth zoom lerp
    this.zoom += (this.targetZoom - this.zoom) * 0.12;

    // Apply auto-rotation if idle
    if (this.autoRotate && !this.isDragging) {
      this.rotY += this.autoRotateSpeed;
    }

    // Apply inertia damping when not dragging
    if (!this.isDragging) {
      this.rotX += this.velX;
      this.rotY += this.velY;
      this.velX *= this.damping;
      this.velY *= this.damping;

      // Keep pitch in bounds
      this.rotX = Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, this.rotX));
    }

    // Return current rotation matrix written into reusable buffer (ZERO allocation)
    return Math3D.createEulerMatrix(this.rotX, this.rotY, this.rotZ, this.rotMatrix);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = OrbitControls;
}
