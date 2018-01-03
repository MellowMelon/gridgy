// @flow

import type {Point, Rect} from "./math.js";
import {isPointInRect, doRectsIntersect} from "./math.js";

// A crude quad tree structure for making it more efficient to query a group of
// rectangles. The only operations needed are adding rectangles and
// point-in-rect queries, which dramatically simplifies how we handle rects
// straddling boundaries: we just put a rect in multiple subtrees. The query
// point can always dig down to a single leaf tree, so querying is still fast.

// Since large rectangles will be moved into all child quad trees, we need a
// way to avoid infinitely subdividing. Our dumb solution to this is to
// increase the splitting limit each time the quad tree splits. This is
// probably not good for performance and could be worth revising later.
const INITIAL_LIMIT = 10;
const LIMIT_INCREMENT = 2;

export default class QuadTree<T> {
  containingRect: Rect;
  splitLimit: number;
  rects: ?Array<[Rect, T]>;
  subTrees: ?Array<QuadTree<T>>;

  constructor(containingRect: Rect, splitLimit: number = INITIAL_LIMIT) {
    this.containingRect = containingRect;
    this.splitLimit = splitLimit;
    this.rects = [];
    this.subTrees = null;
  }

  addRect(rect: Rect, data: T) {
    if (!doRectsIntersect(rect, this.containingRect)) {
      // Do nothing
    } else if (this.subTrees) {
      this.subTrees.forEach(t => t.addRect(rect, data));
    } else if (this.rects) {
      this.rects.push([rect, data]);
      this._maybeSplit();
    }
  }

  findRects(point: Point): Array<[Rect, T]> {
    if (this.subTrees) {
      for (let i = 0; i < this.subTrees.length; i += 1) {
        const t = this.subTrees[i];
        if (isPointInRect(point, t.containingRect)) {
          return t.findRects(point);
        }
      }
    } else if (this.rects) {
      return this.rects.filter(r => isPointInRect(point, r[0]));
    }
    // Should never happen
    return [];
  }

  _maybeSplit() {
    if (this.rects && this.rects.length > this.splitLimit) {
      const [x, y, w, h] = this.containingRect;
      const newLimit = this.splitLimit + LIMIT_INCREMENT;
      const subTrees = [
        new QuadTree([x, y, w / 2, h / 2], newLimit),
        new QuadTree([x + w / 2, y, w / 2, h / 2], newLimit),
        new QuadTree([x, y + h / 2, w / 2, h / 2], newLimit),
        new QuadTree([x + w / 2, y + h / 2, w / 2, h / 2], newLimit),
      ];
      this.subTrees = subTrees;
      this.rects.forEach(r => subTrees.forEach(t => t.addRect(r[0], r[1])));
      this.rects = null;
    }
  }
}
