// @flow

export type Point = [number, number];
export type Rect = [number, number, number, number];
export type Matrix2 = [number, number, number, number];
// The matrix format [a, b, c, d] corresponds to
// [ a c ]
// [ b d ]

export function isPointInRect(p: Point, r2: Rect): boolean {
  return (
    p[0] <= r2[0] + r2[2] &&
    r2[0] <= p[0] &&
    p[1] <= r2[1] + r2[3] &&
    r2[1] <= p[1]
  );
}

export function doRectsIntersect(r1: Rect, r2: Rect): boolean {
  return (
    r1[0] <= r2[0] + r2[2] &&
    r2[0] <= r1[0] + r1[2] &&
    r1[1] <= r2[1] + r2[3] &&
    r2[1] <= r1[1] + r1[3]
  );
}

export function getBoundingBox(poly: Array<Point>): Rect {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < poly.length; i += 1) {
    minX = Math.min(poly[i][0], minX);
    maxX = Math.max(poly[i][0], maxX);
    minY = Math.min(poly[i][1], minY);
    maxY = Math.max(poly[i][1], maxY);
  }
  return [minX, minY, maxX - minX, maxY - minY];
}

export function unionRects(rectList: Array<Rect>): Rect {
  const points = [];
  for (let i = 0; i < rectList.length; i += 1) {
    const r = rectList[i];
    points.push([r[0], r[1]]);
    points.push([r[0] + r[2], r[1] + r[3]]);
  }
  return getBoundingBox(points);
}

// Based on https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html
export function isPointInPolygon([x, y]: Point, poly: Array<Point>): boolean {
  let inside = false;
  for (let i = 0; i < poly.length; i += 1) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    if (y1 > y !== y2 > y && x < (y - y1) * (x2 - x1) / (y2 - y1) + x1) {
      inside = !inside;
    }
  }
  return inside;
}
