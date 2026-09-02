# 3D Neural Face Mesh (Vanilla JavaScript)

An interactive, high-performance 3D human face model rendered in real-time using pure vanilla JavaScript and the HTML5 Canvas 2D API. The project requires zero external libraries, frameworks, or 3D engines (no Three.js, no Babylon.js, no WebGL dependencies).

## Key Features

- **Accurate Human Facial Topology**: Based on the canonical 3D face model with 468 anatomical facial vertices and 898 triangular polygons.
- **Pure Vanilla JS 3D Engine**:
  - Perspective camera projection with focal length and depth attenuation.
  - 3D rotation transforms using Euler angles and quaternions.
  - Triangle surface normal computation for directional Lambertian lighting.
  - Depth sorting (Painter's algorithm) for proper polygon ordering.
  - Optional back-face culling for solid vs. translucent holographic rendering.
- **Three Core Rendering Modes**:
  1. **Points (Vertices)**: 468 glowing points with depth-scaled radius and special accent colors for facial features (eyes, lips, nose contour).
  2. **Wireframe (Edges)**: Antialiased polygonal triangle boundaries with customizable line width and neon glow aura.
  3. **Polygons (Faces)**: Semi-transparent depth-sorted triangular faces with dynamic diffuse lighting and specular highlights.
- **Interactive Orbit Controls**:
  - Left Mouse Drag / Single Touch: 3D trackball rotation with momentum inertia.
  - Mouse Wheel / Pinch Gesture: Smooth perspective zoom.
  - Right Mouse Drag / Shift + Drag: Screen pan.
  - Double Click or `R` key: Reset camera to origin.
  - Spacebar: Toggle auto-rotation.
- **5 Built-in Sci-Fi Color Themes**:
  - *Cyberpunk Neon* (Cyan & Hot Pink)
  - *Matrix Emerald* (Neon Green & Lime)
  - *Electric Sci-Fi Blue* (Deep Blue & Ice Cyan)
  - *Solar Amber* (Gold & Sunburst Orange)
  - *Titanium Silver* (Minimalist Slate & White)
- **High-DPI / Retina Ready**: Automatically adapts to device pixel ratio for razor-sharp rendering on all displays.
- **Zero Runtime Dependencies**: Works 100% offline directly in any modern web browser.

## File Structure

```
evaline-face/
├── index.html           # Fullscreen responsive canvas and floating HUD UI
├── css/
│   └── style.css        # Futuristic cyberpunk aesthetic & glassmorphic HUD controls
├── js/
│   ├── faceData.js      # Canonical 3D face mesh (468 vertices, 898 triangles, 1365 edges)
│   ├── math3d.js        # 3D math: vectors, matrices, projection, quaternions, lighting
│   ├── renderer.js      # Multi-layer canvas renderer (points, wireframe, lit faces)
│   ├── controls.js      # Mouse & touch orbit controls with inertia and zoom
│   └── app.js           # Main application controller, loop, and UI wiring
└── docs/
    ├── README.en.md     # English documentation
    ├── README.ru.md     # Russian documentation
    └── README.uk.md     # Ukrainian documentation
```

## How to Run

1. Open `index.html` directly in any web browser, or:
2. Serve via a local web server:
   ```bash
   python3 -m http.server 8080
   # or
   npx serve .
   ```
3. Navigate to `http://localhost:8080` in your browser.
