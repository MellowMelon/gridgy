// @flow

export type Point = [number, number];
export type Matrix2 = [number, number, number, number];

function invertMatrix2([a, b, c, d]: Matrix2): Matrix2 {
  const det = a * d - b * c;
  if (det === 0) {
    throw new Error(`Can't invert singular matrix [${a}, ${b}, ${c}, ${d}]`);
  }
  return [d / det, -b / det, -c / det, a / det];
}

function multMV2([a, b, c, d]: Matrix2, [x, y]: Point): Point {
  return [x * a + y * b, x * c + y * d];
}

function diffVV2([x1, y1]: Point, [x2, y2]: Point): Point {
  return [x1 - x2, y1 - y2];
}

export function isPointInPolygon([x, y]: Point, poly: Array<Point>): boolean {
  return false;
}

// These next two functions solve the problem of taking a 2 by 2 period matrix
// as used by tesselations and writing an arbitrary point as a sum of one
// inside a small rectangle R plus an integer linear combination of the vectors
// in the period matrix.

// This is equivalent to finding a point with integer coordinates inside R
// after transforming it by the inverse of the period matrix and translating by
// the transform of the input point. Let that transform of R be Q, meaning that
// Q is a parallelogram.

// This first function chooses R. This choice has the property that the center
// of Q is also the center of a 1 by 1 square inside of Q, which will make it
// very easy to find the desired integer point in the other function.

export function getRectForPeriod([a, b, c, d]: Matrix2): Point {
  return [Math.abs(a) + Math.abs(b), Math.abs(c) + Math.abs(d)];
}

// The second function decomposes a point into one inside R and an integer
// linear combination of the period matrix. It returns two 2-vectors. The first
// is the integer components of the period. The second is the point contained
// inside R. So if
// -- the passed point is [x, y]
// -- the passed period matrix is [a, b, c, d], and
// -- the return is [[r, s], [t, u]],
// then we have:
// -- r and s are integers,
// -- 0 <= t <= w, 0 <= u <= h for [w, h] the return of the above function,
// -- x = t + r * a + s * b,
// -- y = u + r * c + s * d.

export function reducePoint(p: Point, periodM: Matrix2): [Point, Point] {
  const [w, h] = getRectForPeriod(periodM);
  const invPeriodM = invertMatrix2(periodM);
  const transformedP = multMV2(invPeriodM, p);
  const centerOfQUnshifted = multMV2(invPeriodM, [w / 2, h / 2]);
  const [cx, cy] = diffVV2(transformedP, centerOfQUnshifted);
  // The 1 by 1 square property guarantees this is inside Q.
  const [r, s] = [Math.round(cx), Math.round(cy)];
  return [
    [r, s],
    [
      p[0] - r * periodM[0] - s * periodM[1],
      p[1] - r * periodM[2] - s * periodM[3],
    ],
  ];
}
