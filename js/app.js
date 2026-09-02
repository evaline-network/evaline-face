/**
 * Main Application Controller
 * Wires Canvas, Renderer, OrbitControls, and HUD UI.
 */

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('faceCanvas');
  if (!canvas || typeof FACE_DATA === 'undefined') {
    console.error('Canvas or FACE_DATA not found.');
    return;
  }

  // Initialize renderer and controls
  const renderer = new FaceRenderer(canvas, FACE_DATA);
  const controls = new OrbitControls(canvas, (key, val) => {
    if (key === 'autoRotate') {
      const toggle = document.getElementById('toggleAutoRotate');
      if (toggle) toggle.checked = val;
    }
  });

  // Telemetry elements
  const fpsEl = document.getElementById('valFps');
  const pitchEl = document.getElementById('valPitch');
  const yawEl = document.getElementById('valYaw');
  const zoomEl = document.getElementById('valZoom');

  // FPS tracking
  let lastTime = performance.now();
  let frameCount = 0;
  let fpsTimer = 0;
  let currentFps = 60;

  // Window resize handler
  window.addEventListener('resize', () => {
    renderer.resize();
  });

  // UI Bindings
  bindControls(renderer, controls);

  // Main Render Loop
  function animate(now) {
    requestAnimationFrame(animate);

    const delta = Math.min(Math.max((now - lastTime) / 1000, 0.0001), 0.1);
    lastTime = now;

    // Calculate FPS
    frameCount++;
    fpsTimer += delta;
    if (fpsTimer >= 0.5) {
      currentFps = Math.round(frameCount / fpsTimer);
      frameCount = 0;
      fpsTimer = 0;
      if (fpsEl) fpsEl.textContent = currentFps;
    }

    // Update 3D Camera & Controls
    const rotMatrix = controls.update(delta);

    // Render 3D Face
    renderer.render(
      rotMatrix,
      4.2,                 // Camera distance
      controls.zoom,       // Zoom
      controls.panX,       // Pan X
      controls.panY,       // Pan Y
      now * 0.001          // Time in seconds
    );

    // Update telemetry display (normalized yaw 0-359°)
    if (pitchEl) pitchEl.textContent = (controls.rotX * (180 / Math.PI)).toFixed(0) + '°';
    if (yawEl) {
      const normYaw = (((controls.rotY * (180 / Math.PI)) % 360) + 360) % 360;
      yawEl.textContent = normYaw.toFixed(0) + '°';
    }
    if (zoomEl) zoomEl.textContent = controls.zoom.toFixed(2) + 'x';
  }

  requestAnimationFrame(animate);
});

/**
 * Bind HUD Controls to Renderer & OrbitControls
 */
function bindControls(renderer, controls) {
  // Mode Toggles
  const togglePoints = document.getElementById('togglePoints');
  if (togglePoints) {
    togglePoints.checked = renderer.options.showPoints;
    togglePoints.addEventListener('change', (e) => {
      renderer.options.showPoints = e.target.checked;
    });
  }

  const toggleWireframe = document.getElementById('toggleWireframe');
  if (toggleWireframe) {
    toggleWireframe.checked = renderer.options.showWireframe;
    toggleWireframe.addEventListener('change', (e) => {
      renderer.options.showWireframe = e.target.checked;
    });
  }

  const toggleFaces = document.getElementById('toggleFaces');
  if (toggleFaces) {
    toggleFaces.checked = renderer.options.showFaces;
    toggleFaces.addEventListener('change', (e) => {
      renderer.options.showFaces = e.target.checked;
    });
  }

  const toggleCulling = document.getElementById('toggleCulling');
  if (toggleCulling) {
    toggleCulling.checked = renderer.options.backfaceCulling;
    toggleCulling.addEventListener('change', (e) => {
      renderer.options.backfaceCulling = e.target.checked;
    });
  }

  const toggleFrameGuide = document.getElementById('toggleFrameGuide');
  if (toggleFrameGuide) {
    toggleFrameGuide.checked = renderer.options.showFrameGuide;
    toggleFrameGuide.addEventListener('change', (e) => {
      renderer.options.showFrameGuide = e.target.checked;
    });
  }

  const toggleGlow = document.getElementById('toggleGlow');
  if (toggleGlow) {
    toggleGlow.checked = renderer.options.glowEffect;
    toggleGlow.addEventListener('change', (e) => {
      renderer.options.glowEffect = e.target.checked;
    });
  }

  const togglePulse = document.getElementById('togglePulse');
  if (togglePulse) {
    togglePulse.checked = renderer.options.pulseEffect;
    togglePulse.addEventListener('change', (e) => {
      renderer.options.pulseEffect = e.target.checked;
    });
  }

  const toggleAutoRotate = document.getElementById('toggleAutoRotate');
  if (toggleAutoRotate) {
    toggleAutoRotate.checked = controls.autoRotate;
    toggleAutoRotate.addEventListener('change', (e) => {
      controls.autoRotate = e.target.checked;
    });
  }

  // Sliders
  const sliderPointSize = document.getElementById('sliderPointSize');
  const valPointSize = document.getElementById('valPointSize');
  if (sliderPointSize) {
    sliderPointSize.value = renderer.options.pointSize;
    sliderPointSize.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      renderer.options.pointSize = val;
      if (valPointSize) valPointSize.textContent = val.toFixed(1);
    });
  }

  const sliderLineWidth = document.getElementById('sliderLineWidth');
  const valLineWidth = document.getElementById('valLineWidth');
  if (sliderLineWidth) {
    sliderLineWidth.value = renderer.options.lineWidth;
    sliderLineWidth.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      renderer.options.lineWidth = val;
      if (valLineWidth) valLineWidth.textContent = val.toFixed(1);
    });
  }

  const sliderFaceOpacity = document.getElementById('sliderFaceOpacity');
  const valFaceOpacity = document.getElementById('valFaceOpacity');
  if (sliderFaceOpacity) {
    sliderFaceOpacity.value = renderer.options.faceOpacity;
    sliderFaceOpacity.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        renderer.options.faceOpacity = val;
        renderer.updateColorPalette();
        if (valFaceOpacity) valFaceOpacity.textContent = Math.round(val * 100) + '%';
      }
    });
  }

  const sliderRotateSpeed = document.getElementById('sliderRotateSpeed');
  if (sliderRotateSpeed) {
    sliderRotateSpeed.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        controls.autoRotateSpeed = val;
      }
    });
  }

  // Theme Selector
  const themeSelect = document.getElementById('themeSelect');
  if (themeSelect) {
    themeSelect.value = renderer.options.theme;
    themeSelect.addEventListener('change', (e) => {
      renderer.setTheme(e.target.value);
    });
  }

  // Reset View Button
  const btnReset = document.getElementById('btnReset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      controls.resetView();
    });
  }

  // Fullscreen Button
  const btnFullscreen = document.getElementById('btnFullscreen');
  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });
  }

  // Snapshot / Screenshot Export Button
  const btnSnapshot = document.getElementById('btnSnapshot');
  if (btnSnapshot) {
    btnSnapshot.addEventListener('click', () => {
      try {
        const link = document.createElement('a');
        link.download = `3d-face-${Date.now()}.png`;
        link.href = renderer.canvas.toDataURL('image/png');
        link.click();
      } catch (err) {
        console.error('Failed to export snapshot:', err);
      }
    });
  }

  // The SINGLE Master Trigger Button & Unified Drawer Controls
  const menuTrigger = document.getElementById('menuTrigger');
  const controlPanel = document.getElementById('controlPanel');
  const panelClose = document.getElementById('panelClose');
  const panelBackdrop = document.getElementById('panelBackdrop');

  function openPanel() {
    if (!controlPanel) return;
    controlPanel.classList.remove('collapsed');
    controlPanel.setAttribute('aria-hidden', 'false');
    if (menuTrigger) menuTrigger.setAttribute('aria-expanded', 'true');
    if (panelBackdrop) panelBackdrop.classList.remove('hidden');
  }

  function closePanel() {
    if (!controlPanel) return;
    controlPanel.classList.add('collapsed');
    controlPanel.setAttribute('aria-hidden', 'true');
    if (menuTrigger) menuTrigger.setAttribute('aria-expanded', 'false');
    if (panelBackdrop) panelBackdrop.classList.add('hidden');
  }

  function togglePanel() {
    if (!controlPanel) return;
    if (controlPanel.classList.contains('collapsed')) {
      openPanel();
    } else {
      closePanel();
    }
  }

  // Initial state: backdrop is hidden
  if (panelBackdrop) panelBackdrop.classList.add('hidden');

  if (menuTrigger) {
    menuTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePanel();
    });
  }

  if (panelClose) {
    panelClose.addEventListener('click', () => {
      closePanel();
    });
  }

  if (panelBackdrop) {
    panelBackdrop.addEventListener('click', () => {
      closePanel();
    });
  }

  // Keyboard shortcut M (Menu) or Escape to open/close
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.code === 'KeyM') {
      e.preventDefault();
      togglePanel();
    } else if (e.code === 'Escape' && controlPanel && !controlPanel.classList.contains('collapsed')) {
      e.preventDefault();
      closePanel();
    }
  });
}
