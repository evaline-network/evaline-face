/**
 * 3D Mathematics & Projection Engine for Eva Face Animation
 * Lightweight, zero-dependency, optimized for 60+ FPS in-browser rendering
 */

class Math3D {
  /**
   * Vector subtraction: a - b
   */
  static sub(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }

  /**
   * Vector addition: a + b
   */
  static add(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  }

  /**
   * Vector scale: v * s
   */
  static scale(v, s) {
    return [v[0] * s, v[1] * s, v[2] * s];
  }

  /**
   * Linear interpolation between two 3D vectors
   */
  static lerp(a, b, t) {
    return [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t
    ];
  }

  /**
   * Dot product: a · b
   */
  static dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  /**
   * Cross product: a × b
   */
  static cross(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  }

  /**
   * Vector length
   */
  static length(v) {
    return Math.hypot(v[0], v[1], v[2]);
  }

  /**
   * Normalize vector
   */
  static normalize(v) {
    const len = Math.hypot(v[0], v[1], v[2]);
    if (len < 1e-9 || isNaN(len)) return [0, 0, 1];
    const inv = 1 / len;
    return [v[0] * inv, v[1] * inv, v[2] * inv];
  }

  /**
   * Create 3x3 Identity Matrix
   */
  static mat3Identity() {
    return [
      1, 0, 0,
      0, 1, 0,
      0, 0, 1
    ];
  }

  /**
   * Create 3x3 Rotation Matrix from Euler Angles (yaw, pitch, roll in radians)
   */
  static mat3FromEuler(yaw, pitch, roll = 0) {
    const cy = Math.cos(yaw),   sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cr = Math.cos(roll),  sr = Math.sin(roll);

    return [
      cy * cr + sy * sp * sr,   -cy * sr + sy * sp * cr,   sy * cp,
      cp * sr,                  cp * cr,                  -sp,
      -sy * cr + cy * sp * sr,  sy * sr + cy * sp * cr,    cy * cp
    ];
  }

  /**
   * Multiply 3x3 matrix by 3D vector: M * v
   */
  static transformVec3(m, v) {
    return [
      m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
      m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
      m[6] * v[0] + m[7] * v[1] + m[8] * v[2]
    ];
  }

  /**
   * Transform in-place into target vector to avoid garbage collection
   */
  static transformVec3Out(m, v, out) {
    out[0] = m[0] * v[0] + m[1] * v[1] + m[2] * v[2];
    out[1] = m[3] * v[0] + m[4] * v[1] + m[5] * v[2];
    out[2] = m[6] * v[0] + m[7] * v[1] + m[8] * v[2];
  }

  /**
   * Smoothstep interpolation
   */
  static smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  /**
   * Ease in out cubic curve
   */
  static easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Ease out quad
   */
  static easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
  }

  /**
   * Ease in out sine
   */
  static easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Math3D;
}
