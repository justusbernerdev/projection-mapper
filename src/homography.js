// Compute CSS matrix3d from 4 corner points
// Maps a rectangle (0,0)-(w,h) to arbitrary quad
// Reference: https://franklinta.com/2014/09/08/computing-css-matrix3d-transforms/

function adjugate(m) {
  return [
    m[4] * m[8] - m[5] * m[7],
    m[2] * m[7] - m[1] * m[8],
    m[1] * m[5] - m[2] * m[4],
    m[5] * m[6] - m[3] * m[8],
    m[0] * m[8] - m[2] * m[6],
    m[2] * m[3] - m[0] * m[5],
    m[3] * m[7] - m[4] * m[6],
    m[1] * m[6] - m[0] * m[7],
    m[0] * m[4] - m[1] * m[3],
  ];
}

function multiplyMatMat(a, b) {
  const c = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) {
        sum += a[3 * i + k] * b[3 * k + j];
      }
      c.push(sum);
    }
  }
  return c;
}

function multiplyMatVec(m, v) {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

function basisToPoints(x1, y1, x2, y2, x3, y3, x4, y4) {
  const m = [x1, x2, x3, y1, y2, y3, 1, 1, 1];
  const v = multiplyMatVec(adjugate(m), [x4, y4, 1]);
  return multiplyMatMat(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
}

/**
 * Compute the CSS matrix3d transform string that maps
 * a rectangle of (w x h) to the given 4 corners.
 * Corners: [topLeft, topRight, bottomRight, bottomLeft]
 * Each corner: {x, y}
 */
export function computeMatrix3d(w, h, corners) {
  const [tl, tr, br, bl] = corners;

  const s = basisToPoints(0, 0, w, 0, 0, h, w, h);
  const d = basisToPoints(tl.x, tl.y, tr.x, tr.y, bl.x, bl.y, br.x, br.y);
  const t = multiplyMatMat(d, adjugate(s));

  // Normalize so t[8] = 1
  for (let i = 0; i < 9; i++) t[i] /= t[8];

  // Convert 3x3 2D homography to 4x4 CSS matrix3d (column-major)
  const matrix = [
    t[0], t[3], 0, t[6],
    t[1], t[4], 0, t[7],
    0,    0,    1, 0,
    t[2], t[5], 0, t[8],
  ];

  return `matrix3d(${matrix.join(',')})`;
}

/**
 * Inverse homography: map screen coords back to local (0,0)-(w,h) space.
 * Used for drawing canvas input mapping.
 */
export function inverseMap(w, h, corners, screenX, screenY) {
  const [tl, tr, br, bl] = corners;

  const s = basisToPoints(0, 0, w, 0, 0, h, w, h);
  const d = basisToPoints(tl.x, tl.y, tr.x, tr.y, bl.x, bl.y, br.x, br.y);

  // screen -> local: s * adj(d) * screenPoint
  const m = multiplyMatMat(s, adjugate(d));
  const p = multiplyMatVec(m, [screenX, screenY, 1]);

  return { x: p[0] / p[2], y: p[1] / p[2] };
}
