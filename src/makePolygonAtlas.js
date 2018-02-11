// @flow

import type {Point, Rect} from "./math.js";
import {getBoundingBox, isPointInPolygon} from "./math.js";
import makeQuadTree from "./makeQuadTree.js";

// A generalization of a quad tree to arbitrary polygons. Implemented by making
// a quad tree of bounding boxes and testing each of the results.

type PolygonData<T> = Array<[Array<Point>, T]>;
export type QueryPolygonAtlas<T> = Point => PolygonData<T>;

// Instead of creating an object, we just return the query function.
export default function makePolygonAtlas<T>(
  bb: Rect,
  polygonData: PolygonData<T>
): QueryPolygonAtlas<T> {
  const rectData = polygonData.map(n => [getBoundingBox(n[0]), n]);
  const queryQuadTree = makeQuadTree(bb, rectData);
  return point =>
    queryQuadTree(point)
      .filter(c => isPointInPolygon(point, c[1][0]))
      .map(c => c[1]);
}
