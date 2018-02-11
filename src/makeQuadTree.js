// @flow

import type {Point, Rect} from "./math.js";
import {isPointInRect, doRectsIntersect} from "./math.js";

// An extremely crude quad tree, in which all rectangles are known up-front
// and all queries are points.

type RectData<T> = Array<[Rect, T]>;
export type QueryQuadTree<T> = Point => RectData<T>;

// Since large rectangles will be moved into all child quad trees, we need a
// way to avoid infinitely subdividing. Our dumb solution to this is to
// increase the splitting limit each time the quad tree splits.
const QT_INITIAL_LIMIT = 5;
const QT_LIMIT_INCREMENT = 5;

// Instead of creating an object, we just return the query function.
export default function makeQuadTree<T>(
  bb: Rect,
  rectData: RectData<T>,
  splitLimit: number = QT_INITIAL_LIMIT
): QueryQuadTree<T> {
  const applicRects: RectData<T> = rectData.filter(n =>
    doRectsIntersect(bb, n[0])
  );

  if (applicRects.length > splitLimit) {
    const [x, y, w, h] = bb;
    const subTreeBBs = [
      [x, y, w / 2, h / 2],
      [x + w / 2, y, w / 2, h / 2],
      [x, y + h / 2, w / 2, h / 2],
      [x + w / 2, y + h / 2, w / 2, h / 2],
    ];
    const newLimit = splitLimit + QT_LIMIT_INCREMENT;
    const subTreeQueries = subTreeBBs.map(subBB =>
      makeQuadTree(subBB, applicRects, newLimit)
    );
    return point => findRectsInQuadTree(point, subTreeBBs, subTreeQueries);
  }
  return point => applicRects.filter(r => isPointInRect(point, r[0]));
}

function findRectsInQuadTree<T>(
  point: Point,
  subTreeBBs: Array<Rect>,
  subTreeQueries: Array<QueryQuadTree<T>>
): RectData<T> {
  for (let i = 0; i < 4; i += 1) {
    if (isPointInRect(point, subTreeBBs[i])) {
      return subTreeQueries[i](point);
    }
  }
  return [];
}
