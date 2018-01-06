// @flow

import type {Point, Rect} from "./math.js";
import {isPointInPolygon, getBoundingBox} from "./math.js";
import QuadTree from "./QuadTree.js";

// A spatial indexing class that allows efficiently querying for which polygons
// contain a point. Thin wrapper around QuadTree.

export default class PolygonAtlas<T> {
  quadTree: QuadTree<[Array<Point>, T]>;

  constructor(containingRect: Rect) {
    this.quadTree = new QuadTree(containingRect);
  }

  addPolygon(polygon: Array<Point>, data: T) {
    const bbRect = getBoundingBox(polygon);
    const quadTreeData = [polygon, data];
    this.quadTree.addRect(bbRect, quadTreeData);
  }

  findPolygons(point: Point): Array<[Array<Point>, T]> {
    const candidates = this.quadTree.findRects(point);
    return candidates
      .filter(c => isPointInPolygon(point, c[1][0]))
      .map(c => c[1]);
  }
}
