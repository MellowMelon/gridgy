// @flow

import {describe, it} from "mocha";
import {expect} from "chai";

import {
  isPointInRect,
  doRectsIntersect,
  unionRects,
  getBoundingBox,
  isPointInPolygon,
} from "../src/math.js";

describe("isPointInRect", () => {
  it("should return whether the point is in the rectangle", () => {
    const expectIn = (p, r2) => {
      return expect(isPointInRect(p, r2), p.join(",") + " " + r2.join(","));
    };
    expectIn([1, 1], [0, 0, 10, 20]).to.equal(true);
    expectIn([0, 0], [0, 0, 10, 20]).to.equal(true);
    expectIn([10, 20], [0, 0, 10, 20]).to.equal(true);
    expectIn([10, 20], [-100, 19, 120, 2]).to.equal(true);

    expectIn([10, 20], [-1, -1, 10, 20]).to.equal(false);
    expectIn([10, 20], [3, 21, 10, 20]).to.equal(false);
  });
});

describe("doRectsIntersect", () => {
  it("should return whether the two rectangles intersect", () => {
    const expectInt = (r1, r2) => {
      return expect(
        doRectsIntersect(r1, r2),
        r1.join(",") + " " + r2.join(",")
      );
    };
    expectInt([0, 0, 10, 10], [9, 9, 2, 2]).to.equal(true);
    expectInt([0, 0, 10, 10], [5, 5, 2, 2]).to.equal(true);
    expectInt([-100, 5, 200, 2], [0, 0, 10, 10]).to.equal(true);

    expectInt([0, 0, 10, 10], [-9, 9, 2, 2]).to.equal(false);
    expectInt([0, 0, 10, 10], [5, 15, 2, 2]).to.equal(false);
    expectInt([-100, 5, 2, 200], [0, 0, 10, 10]).to.equal(false);
  });
});

describe("getBoundingBox", () => {
  it("should get the smallest rectangle containing the list of points", () => {
    const p = [[1, 0], [2, 4], [-1, 5]];
    expect(getBoundingBox(p)).to.deep.equal([-1, 0, 3, 5]);
  });
});

describe("unionRects", () => {
  it("should get the smallest rectangle containing all given ones", () => {
    const r1 = [2, 3, 4, 5];
    const r2 = [-2, 2, 2, 8];
    const r3 = [0, -1, 3, 6];
    expect(unionRects([r1, r2, r3])).to.deep.equal([-2, -1, 8, 11]);
  });
});

describe("isPointInPolygon", () => {
  it("should work for rectangles", () => {
    const r = [[0, 0], [2, 0], [2, 4], [0, 4]];
    expect(isPointInPolygon([1, 1], r), "1,1").to.equal(true);
    expect(isPointInPolygon([3, 1], r), "3,1").to.equal(false);
    expect(isPointInPolygon([1, 3], r), "1,3").to.equal(true);
    expect(isPointInPolygon([3, 3], r), "3,3").to.equal(false);
    expect(isPointInPolygon([1, 5], r), "1,5").to.equal(false);
    expect(isPointInPolygon([3, 5], r), "3,5").to.equal(false);
    expect(isPointInPolygon([1, -1], r), "1,-1").to.equal(false);
    expect(isPointInPolygon([-1, 3], r), "-1,3").to.equal(false);
  });

  it("should only be in one polygon when a point is on the boundary of two", () => {
    const expectDifferent = (point, tn1, tn2) => {
      const pointStr = point.join(",");
      expect(
        isPointInPolygon(point, triTable[tn1]),
        `${pointStr} in ${tn1} != ${pointStr} in ${tn2}`
      ).to.not.equal(isPointInPolygon(point, triTable[tn2]));
    };
    const triTable = {
      tl: [[0, 0], [2, 0], [0, 2]],
      mid: [[2, 0], [2, 2], [0, 2]],
      tr: [[2, 0], [4, 0], [2, 2]],
      bl: [[0, 2], [2, 2], [0, 4]],
    };
    expectDifferent([1, 1], "tl", "mid");
    expectDifferent([2, 1], "tr", "mid");
    expectDifferent([1, 2], "bl", "mid");
  });

  it("should work for concave polygons", () => {
    const p = [[0, 6], [3, 0], [6, 6], [4, 6], [3, 3], [2, 6]];
    expect(isPointInPolygon([0, 5], p), "0,5").to.equal(false);
    expect(isPointInPolygon([1, 5], p), "1,5").to.equal(true);
    expect(isPointInPolygon([3, 5], p), "3,5").to.equal(false);
    expect(isPointInPolygon([5, 5], p), "5,5").to.equal(true);
    expect(isPointInPolygon([6, 5], p), "6,5").to.equal(false);
  });
});
