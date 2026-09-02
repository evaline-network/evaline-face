# 📋 Project Kanban Board - 3D Neural Female Face Mesh

[English (`docs/KANBAN.en.md`)](docs/KANBAN.en.md) | [Русский (`docs/KANBAN.ru.md`)](docs/KANBAN.ru.md) | [Українська (`docs/KANBAN.uk.md`)](docs/KANBAN.uk.md)

---

## 📌 TODO (Planned Features)

- [ ] **Interactive Facial Expression Morphing**: Implement WebGL-less 3D blendshapes for subtle expressions (smile, blink, eyebrow raise).
- [ ] **Audio Reactive Holographic Waves**: Connect Web Audio API / Microphone input to drive vertex pulse amplitude and neon glow frequency.
- [ ] **PWA (Progressive Web App) Support**: Add Web Manifest and Service Worker for offline home screen installation on iOS & Android.
- [ ] **3D Mesh Exporter**: Add feature in Control Matrix to export current transformed face posture as `.OBJ` or `.STL`.

---

## ⚙️ DOING (In Progress)

- [x] **Continuous Touch & Accessibility Audit**: Monitoring high-DPI viewports, orientation changes, and ARIA screen reader attributes.
- [x] **Repository Synchronization**: Maintaining clean git history and parallel trilingual documentation across commits.

---

## ✅ DONE (Completed Tasks)

- [x] **Pure Vanilla JS 3D Engine**: 468 vertices, 898 triangular polygons, 1,365 unique edges rendered on HTML5 Canvas 2D without external libraries.
- [x] **Procedural Female 3D Sculpting**: Algorithmically sculpted V-line jaw, high cheekbones, slender nose bridge, Cupid's bow plush lips, and almond cat-eye curves.
- [x] **Zero Heap Allocation Render Loop**: Preallocated buffers, pooled triangle objects, and 256-level color palette caching for steady 60 FPS.
- [x] **Strict Screen Centering**: Model centroid $(0, 0, 0)$ locked to exact viewport center $(\frac{W}{2}, \frac{H}{2})$ across all angles.
- [x] **100vmin Square Bounding Box**: Scaled via $\text{fov} = 1.85 \times \text{vmin} \times \text{zoom}$ to fit perfectly inside $100\text{vmin} \times 100\text{vmin}$.
- [x] **100vmin Cyber Frame Guide**: Toggleable corner brackets and center crosshairs visually framing the 100vmin square.
- [x] **Single-Button Master Control Matrix**: All scattered UI buttons, sliders, and badges consolidated inside one drawer hidden under `[⚙ CONTROLS]`.
- [x] **Mobile Smartphone Touch Optimization**: Smooth 1-finger trackball rotate, 2-finger pinch zoom, Retina DPR capped at 2.0, 44px touch targets, safe-area insets.
- [x] **GitHub Repository Deployment**: Created public repo and pushed to [https://github.com/evabot-online/evaline-face](https://github.com/evabot-online/evaline-face).
- [x] **Trilingual Documentation Suite**: Complete parallel documentation (`*.en.md`, `*.ru.md`, `*.uk.md`) for all audits, features, and reports.
