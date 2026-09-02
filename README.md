# 3D Neural Face Mesh (Vanilla JavaScript)

An interactive, high-performance 3D human face model rendered in real-time using pure vanilla JavaScript and the HTML5 Canvas 2D API. Features a 100vmin square viewport constraint, strict screen centering, and a unified glassmorphic HUD drawer hidden under a single master button.

Zero external libraries, zero frameworks, zero WebGL dependencies.

---

## 🌐 Multilingual Documentation & Reports

- **English (Primary):** [docs/README.en.md](docs/README.en.md)
  - [100vmin Centering & Unified Controls Report (EN)](docs/centering_and_100vmin_report.en.md)
  - [3D Math & Performance Audit (EN)](docs/AUDIT_REPORT.en.md)
  - [UI & Accessibility Inspection (EN)](docs/ui_inspection_report.en.md)
- **Русский:** [docs/README.ru.md](docs/README.ru.md)
  - [Отчёт о центрировании 100vmin и единой панели (RU)](docs/centering_and_100vmin_report.ru.md)
  - [Аудит 3D-математики и производительности (RU)](docs/AUDIT_REPORT.ru.md)
  - [Аудит UI и доступности (RU)](docs/ui_inspection_report.ru.md)
- **Українська:** [docs/README.uk.md](docs/README.uk.md)
  - [Звіт про центрування 100vmin та єдину панель (UK)](docs/centering_and_100vmin_report.uk.md)
  - [Аудит 3D-математики та продуктивності (UK)](docs/AUDIT_REPORT.uk.md)
  - [Аудит UI та доступності (UK)](docs/ui_inspection_report.uk.md)

---

## 🚀 Quick Start

Open `index.html` directly in any web browser, or serve locally:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## 🎮 Controls

- **Left Mouse Drag / Touch**: Orbit rotate in 3D around the head's exact center
- **Mouse Wheel / Pinch**: Zoom in and out
- **Spacebar**: Toggle auto-rotation
- **R / Double-click**: Reset view
- **M / Escape / `[⚙ CONTROLS]` Button**: Open/close the unified Control Matrix drawer
