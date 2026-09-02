/**
 * 3D Mathematics Utility for Vanilla JS 3D Engine
 * Handles vectors, matrices, quaternions, perspective projection, and lighting.
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
   * Vector scalar multiplication: v * s
   */
  static scale(v, s) {
    return [v[0] * s, v[1] * s, v[2] * s];
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
   * Vector length (magnitude)
   */
  static length(v) {
    return Math.hypot(v[0], v[1], v[2]);
  }

  /**
   * Normalize vector to unit length (zero-division & NaN safe)
   */
  static normalize(v) {
    const len = Math.hypot(v[0], v[1], v[2]);
    if (len < 1e-9 || isNaN(len)) return [0, 0, 1];
    const inv = 1 / len;
    return [v[0] * inv, v[1] * inv, v[2] * inv];
  }

  /**
   * Create a 3x3 rotation matrix from Euler angles (pitch=X, yaw=Y, roll=Z in radians)
   * Supports writing directly to an existing Float32Array/Array to eliminate allocations.
   */
  static createEulerMatrix(rotX, rotY, rotZ, out = null) {
    const cx = Math.cos(rotX), sx = Math.sin(rotX);
    const cy = Math.cos(rotY), sy = Math.sin(rotY);
    const cz = Math.cos(rotZ), sz = Math.sin(rotZ);

    const m = out || new Float32Array(9);
    // Matrix multiplication: Rz * Ry * Rx
    m[0] = cy * cz;
    m[1] = sx * sy * cz - cx * sz;
    m[2] = cx * sy * cz + sx * sz;
    m[3] = cy * sz;
    m[4] = sx * sy * sz + cx * cz;
    m[5] = cx * sy * sz - sx * cz;
    m[6] = -sy;
    m[7] = sx * cy;
    m[8] = cx * cy;
    return m;
  }

  /**
   * Transform a 3D point by a 3x3 matrix
   */
  static transformPoint(p, m) {
    return [
      m[0] * p[0] + m[1] * p[1] + m[2] * p[2],
      m[3] * p[0] + m[4] * p[1] + m[5] * p[2],
      m[6] * p[0] + m[7] * p[1] + m[8] * p[2]
    ];
  }

  /**
   * Compute normal vector for a triangle defined by 3 vertices (v0, v1, v2)
   * Hardened against zero area and NaN.
   */
  static computeNormal(v0, v1, v2) {
    const e1x = v1[0] - v0[0], e1y = v1[1] - v0[1], e1z = v1[2] - v0[2];
    const e2x = v2[0] - v0[0], e2y = v2[1] - v0[1], e2z = v2[2] - v0[2];
    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    const nz = e1x * e2y - e1y * e2x;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-9 || isNaN(len)) return [0, 0, 1];
    const inv = 1 / len;
    return [nx * inv, ny * inv, nz * inv];
  }

  /**
   * Perspective projection of a 3D point in camera space to 2D screen coordinates
   * Camera is at (0, 0, distance), looking towards origin (0, 0, 0) along -Z axis.
   * Model front points towards +Z.
   * In camera frame: distance from camera lens zCam = distance - point3D[2].
   * Supports target object recycling to eliminate GC allocations in render loops.
   */
  static project(point3D, width, height, distance = 4.0, fov = 650, panX = 0, panY = 0, target = null) {
    const zCam = distance - point3D[2];
    if (zCam <= 0.05 || isNaN(zCam)) {
      if (target) target.visible = false;
      return null; // Behind or too close to near clipping plane
    }

    const scale = fov / zCam;
    const screenX = width * 0.5 + (point3D[0] + panX) * scale;
    const screenY = height * 0.5 - (point3D[1] + panY) * scale; // Invert Y for screen

    if (target) {
      target.x = screenX;
      target.y = screenY;
      target.z = zCam;
      target.scale = scale;
      target.visible = true;
      return target;
    }

    return {
      x: screenX,
      y: screenY,
      z: zCam,
      scale: scale,
      visible: true
    };
  }

  /**
   * Quaternion operations for smooth arcball / trackball rotation
   */
  static quatIdentity() {
    return [0, 0, 0, 1]; // [x, y, z, w]
  }

  static quatFromAxisAngle(axis, angle) {
    const halfAngle = angle * 0.5;
    const s = Math.sin(halfAngle);
    const normAxis = this.normalize(axis);
    return [normAxis[0] * s, normAxis[1] * s, normAxis[2] * s, Math.cos(halfAngle)];
  }

  static quatMultiply(q1, q2) {
    return [
      q1[3] * q2[0] + q1[0] * q2[3] + q1[1] * q2[2] - q1[2] * q2[1],
      q1[3] * q2[1] - q1[0] * q2[2] + q1[1] * q2[3] + q1[2] * q2[0],
      q1[3] * q2[2] + q1[0] * q2[1] - q1[1] * q2[0] + q1[2] * q2[3],
      q1[3] * q2[3] - q1[0] * q2[0] - q1[1] * q2[1] - q1[2] * q2[2]
    ];
  }

  static quatNormalize(q) {
    const len = Math.hypot(q[0], q[1], q[2], q[3]);
    if (len < 1e-9 || isNaN(len)) return [0, 0, 0, 1];
    const inv = 1 / len;
    return [q[0] * inv, q[1] * inv, q[2] * inv, q[3] * inv];
  }

  static quatToMatrix(q) {
    const x = q[0], y = q[1], z = q[2], w = q[3];
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;

    return [
      1 - (yy + zz), xy - wz,         xz + wy,
      xy + wz,       1 - (xx + zz),   yz - wx,
      xz - wy,       yz + wx,         1 - (xx + yy)
    ];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Math3D;
}
