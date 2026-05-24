// Simple matrix utilities for WebGPU demo

export type Mat4 = Float32Array;
export type Vec3 = [number, number, number];

export function mat4Identity(): Mat4 {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

export function mat4Perspective(
  fov: number,
  aspect: number,
  near: number,
  far: number
): Mat4 {
  const f = 1.0 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect,
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    (far + near) * nf,
    -1,
    0,
    0,
    2 * far * near * nf,
    0,
  ]);
}

export function mat4LookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
  const zAxis = normalize(subtract(eye, target));
  const xAxis = normalize(cross(up, zAxis));
  const yAxis = cross(zAxis, xAxis);

  return new Float32Array([
    xAxis[0],
    yAxis[0],
    zAxis[0],
    0,
    xAxis[1],
    yAxis[1],
    zAxis[1],
    0,
    xAxis[2],
    yAxis[2],
    zAxis[2],
    0,
    -dot(xAxis, eye),
    -dot(yAxis, eye),
    -dot(zAxis, eye),
    1,
  ]);
}

export function mat4Multiply(a: Mat4, b: Mat4, dst?: Mat4): Mat4 {
  dst = dst || new Float32Array(16);
  const a00 = a[0],
    a01 = a[1],
    a02 = a[2],
    a03 = a[3];
  const a10 = a[4],
    a11 = a[5],
    a12 = a[6],
    a13 = a[7];
  const a20 = a[8],
    a21 = a[9],
    a22 = a[10],
    a23 = a[11];
  const a30 = a[12],
    a31 = a[13],
    a32 = a[14],
    a33 = a[15];

  let b0 = b[0],
    b1 = b[1],
    b2 = b[2],
    b3 = b[3];
  dst[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  dst[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  dst[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  dst[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[4];
  b1 = b[5];
  b2 = b[6];
  b3 = b[7];
  dst[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  dst[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  dst[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  dst[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[8];
  b1 = b[9];
  b2 = b[10];
  b3 = b[11];
  dst[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  dst[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  dst[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  dst[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[12];
  b1 = b[13];
  b2 = b[14];
  b3 = b[15];
  dst[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  dst[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  dst[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  dst[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  return dst;
}

export function mat4Translate(m: Mat4, v: Vec3, dst?: Mat4): Mat4 {
  dst = dst || new Float32Array(16);
  const x = v[0],
    y = v[1],
    z = v[2];
  if (dst !== m) {
    dst[0] = m[0];
    dst[1] = m[1];
    dst[2] = m[2];
    dst[3] = m[3];
    dst[4] = m[4];
    dst[5] = m[5];
    dst[6] = m[6];
    dst[7] = m[7];
    dst[8] = m[8];
    dst[9] = m[9];
    dst[10] = m[10];
    dst[11] = m[11];
  }
  dst[12] = m[0] * x + m[4] * y + m[8] * z + m[12];
  dst[13] = m[1] * x + m[5] * y + m[9] * z + m[13];
  dst[14] = m[2] * x + m[6] * y + m[10] * z + m[14];
  dst[15] = m[3] * x + m[7] * y + m[11] * z + m[15];
  return dst;
}

export function mat4RotateX(m: Mat4, angle: number, dst?: Mat4): Mat4 {
  dst = dst || new Float32Array(16);
  const s = Math.sin(angle);
  const c = Math.cos(angle);
  const m10 = m[4],
    m11 = m[5],
    m12 = m[6],
    m13 = m[7];
  const m20 = m[8],
    m21 = m[9],
    m22 = m[10],
    m23 = m[11];

  if (dst !== m) {
    dst[0] = m[0];
    dst[1] = m[1];
    dst[2] = m[2];
    dst[3] = m[3];
    dst[12] = m[12];
    dst[13] = m[13];
    dst[14] = m[14];
    dst[15] = m[15];
  }

  dst[4] = m10 * c + m20 * s;
  dst[5] = m11 * c + m21 * s;
  dst[6] = m12 * c + m22 * s;
  dst[7] = m13 * c + m23 * s;
  dst[8] = m20 * c - m10 * s;
  dst[9] = m21 * c - m11 * s;
  dst[10] = m22 * c - m12 * s;
  dst[11] = m23 * c - m13 * s;

  return dst;
}

export function mat4RotateY(m: Mat4, angle: number, dst?: Mat4): Mat4 {
  dst = dst || new Float32Array(16);
  const s = Math.sin(angle);
  const c = Math.cos(angle);
  const m00 = m[0],
    m01 = m[1],
    m02 = m[2],
    m03 = m[3];
  const m20 = m[8],
    m21 = m[9],
    m22 = m[10],
    m23 = m[11];

  if (dst !== m) {
    dst[4] = m[4];
    dst[5] = m[5];
    dst[6] = m[6];
    dst[7] = m[7];
    dst[12] = m[12];
    dst[13] = m[13];
    dst[14] = m[14];
    dst[15] = m[15];
  }

  dst[0] = m00 * c - m20 * s;
  dst[1] = m01 * c - m21 * s;
  dst[2] = m02 * c - m22 * s;
  dst[3] = m03 * c - m23 * s;
  dst[8] = m00 * s + m20 * c;
  dst[9] = m01 * s + m21 * c;
  dst[10] = m02 * s + m22 * c;
  dst[11] = m03 * s + m23 * c;

  return dst;
}

export function mat4Scale(m: Mat4, v: Vec3, dst?: Mat4): Mat4 {
  dst = dst || new Float32Array(16);
  const x = v[0],
    y = v[1],
    z = v[2];
  dst[0] = m[0] * x;
  dst[1] = m[1] * x;
  dst[2] = m[2] * x;
  dst[3] = m[3] * x;
  dst[4] = m[4] * y;
  dst[5] = m[5] * y;
  dst[6] = m[6] * y;
  dst[7] = m[7] * y;
  dst[8] = m[8] * z;
  dst[9] = m[9] * z;
  dst[10] = m[10] * z;
  dst[11] = m[11] * z;
  if (dst !== m) {
    dst[12] = m[12];
    dst[13] = m[13];
    dst[14] = m[14];
    dst[15] = m[15];
  }
  return dst;
}

export function mat4Rotate(
  m: Mat4,
  axis: Vec3,
  angle: number,
  dst?: Mat4
): Mat4 {
  dst = dst || new Float32Array(16);
  let x = axis[0],
    y = axis[1],
    z = axis[2];
  const len = Math.sqrt(x * x + y * y + z * z);
  if (len === 0) {
    return m;
  }
  x /= len;
  y /= len;
  z /= len;

  const s = Math.sin(angle);
  const c = Math.cos(angle);
  const t = 1 - c;

  const r00 = t * x * x + c;
  const r01 = t * x * y + s * z;
  const r02 = t * x * z - s * y;
  const r10 = t * x * y - s * z;
  const r11 = t * y * y + c;
  const r12 = t * y * z + s * x;
  const r20 = t * x * z + s * y;
  const r21 = t * y * z - s * x;
  const r22 = t * z * z + c;

  const m00 = m[0],
    m01 = m[1],
    m02 = m[2],
    m03 = m[3];
  const m10 = m[4],
    m11 = m[5],
    m12 = m[6],
    m13 = m[7];
  const m20 = m[8],
    m21 = m[9],
    m22 = m[10],
    m23 = m[11];

  dst[0] = m00 * r00 + m10 * r01 + m20 * r02;
  dst[1] = m01 * r00 + m11 * r01 + m21 * r02;
  dst[2] = m02 * r00 + m12 * r01 + m22 * r02;
  dst[3] = m03 * r00 + m13 * r01 + m23 * r02;
  dst[4] = m00 * r10 + m10 * r11 + m20 * r12;
  dst[5] = m01 * r10 + m11 * r11 + m21 * r12;
  dst[6] = m02 * r10 + m12 * r11 + m22 * r12;
  dst[7] = m03 * r10 + m13 * r11 + m23 * r12;
  dst[8] = m00 * r20 + m10 * r21 + m20 * r22;
  dst[9] = m01 * r20 + m11 * r21 + m21 * r22;
  dst[10] = m02 * r20 + m12 * r21 + m22 * r22;
  dst[11] = m03 * r20 + m13 * r21 + m23 * r22;

  if (dst !== m) {
    dst[12] = m[12];
    dst[13] = m[13];
    dst[14] = m[14];
    dst[15] = m[15];
  }

  return dst;
}

export function mat3FromMat4(m: Mat4, dst?: Float32Array): Float32Array {
  dst = dst || new Float32Array(12);
  dst[0] = m[0];
  dst[1] = m[1];
  dst[2] = m[2];
  dst[3] = 0;
  dst[4] = m[4];
  dst[5] = m[5];
  dst[6] = m[6];
  dst[7] = 0;
  dst[8] = m[8];
  dst[9] = m[9];
  dst[10] = m[10];
  dst[11] = 0;
  return dst;
}

// Vec3 helpers
function subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len > 0) {
    return [v[0] / len, v[1] / len, v[2] / len];
  }
  return v;
}

// Vec3 cross product for normal calculation
export function vec3Cross(a: number[], b: number[]): number[] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function vec3Subtract(a: number[], b: number[]): number[] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function vec3Normalize(v: number[]): number[] {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len > 0) {
    return [v[0] / len, v[1] / len, v[2] / len];
  }
  return v;
}
