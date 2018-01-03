// @flow

import {describe, it} from "mocha";
import {expect} from "chai";

import QuadTree from "../src/QuadTree.js";

describe("QuadTree", () => {
  const t = new QuadTree([0, 0, 100, 100]);

  for (let i = 0; i < 10; i += 1) {
    for (let j = 0; j < 10; j += 1) {
      t.addRect([2 + 10 * i, 2 + 10 * j, 14, 14], i + "," + j);
    }
  }

  const expectP = function(point) {
    // Using sort to enforce consistent ordering
    return expect(t.findRects(point).sort(), point.join(","));
  };

  it("should find all rectangles that contain the point", () => {
    expectP([1, 1]).to.deep.equal([]);
    expectP([3, 3]).to.deep.equal([[[2, 2, 14, 14], "0,0"]]);
    expectP([9, 99]).to.deep.equal([[[2, 92, 14, 14], "0,9"]]);
    expectP([99, 99]).to.deep.equal([[[92, 92, 14, 14], "9,9"]]);
    expectP([3, 17]).to.deep.equal([[[2, 12, 14, 14], "0,1"]]);
    expectP([13, 37]).to.deep.equal([
      [[12, 32, 14, 14], "1,3"],
      [[2, 32, 14, 14], "0,3"],
    ]);
    expectP([45, 55]).to.deep.equal([
      [[32, 42, 14, 14], "3,4"],
      [[32, 52, 14, 14], "3,5"],
      [[42, 42, 14, 14], "4,4"],
      [[42, 52, 14, 14], "4,5"],
    ]);
  });
});
