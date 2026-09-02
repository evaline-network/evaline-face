# 100vmin Centering & Unified Control Drawer Report

## Overview
This technical report documents the implementation of screen centering, the 100vmin square bounding constraint, and the consolidation of all UI elements under a single master trigger button for the 3D Neural Face Mesh.

## Key Changes Implemented

### 1. Guaranteed Screen Centering
- **Elimination of Panning Drift:** The rendering projection equations have been decoupled from any positional panning offsets:
  $$x_{\text{screen}} = \frac{W}{2} + x_{\text{rotated}} \cdot \frac{\text{fov}}{z_{\text{cam}}}$$
  $$y_{\text{screen}} = \frac{H}{2} - y_{\text{rotated}} \cdot \frac{\text{fov}}{z_{\text{cam}}}$$
- The center of the head model $(0, 0, 0)$ is guaranteed to map exactly to the viewport center $(\frac{W}{2}, \frac{H}{2})$.
- `OrbitControls` mouse and touch interaction handlers were updated so that dragging always rotates the head around its centroid, preventing accidental camera shifts away from the center.

### 2. 100vmin Square Bounding Box
- The scale has been normalized relative to $\text{vmin} = \min(W, H)$:
  $$\text{fov} = \text{vmin} \times 1.85 \times \text{zoom}$$
- With a camera distance of $4.2$ and normalized head coordinate span $[-1.0, 1.0]$, the maximum screen dimension of the face spans $0.925 \times \text{vmin}$.
- This ensures the head fits within a $100\text{vmin} \times 100\text{vmin}$ square across all device aspect ratios (mobile vertical, desktop ultrawide, and square screens).
- An optional, sci-fi cyber frame guide (`drawFrameGuide`) renders corner brackets and a central crosshair to visually frame the 100vmin boundary.

### 3. Single Master Trigger & Unified Control Block
- All scattered buttons, header banners, floating hints, and telemetry badges have been consolidated into a single unified drawer (`#controlPanel`).
- In the default state, **only one button** is visible on screen:
  `[⚙ CONTROLS]` positioned at the top-right corner.
- Clicking the trigger button opens a frosted glassmorphic drawer containing:
  1. Real-time telemetry (FPS, Pitch, Yaw, Zoom).
  2. Quick actions (Reset View, Snapshot PNG export, Fullscreen).
  3. Render mode toggles (Points, Wireframe, Polygons, 100vmin Frame Guide, Backface Culling, Glow, Pulse).
  4. Fine tuning sliders (Point Size, Wire Width, Face Shading, Rotation Speed).
  5. Color palette selector (5 themes).
  6. Keyboard and touch interaction shortcuts.
- The drawer can be dismissed by clicking `✕ CLOSE`, clicking the darkened backdrop, or pressing `Esc` / `M`.

## Verification
- Verified in headless browser with Puppeteer.
- Confirmed zero console errors and steady 60 FPS performance.
