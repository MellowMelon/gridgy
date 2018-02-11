// @flow

import {describe, it} from "mocha";
import {expect} from "chai";

import makeVoronoiAtlas from "../src/makeVoronoiAtlas.js";

describe("makeVoronoiAtlas", () => {
  const atlas = makeVoronoiAtlas([
    [[0, 0], 0],
    [[10, 20], 1],
    [[20, 0], 2],
    [[30, 30], 3],
    [[40, 10], 4],
  ]);

  const expectP = function(point) {
    // Using sort to enforce consistent ordering.
    const res = atlas(point).sort();
    // Then dropping polygon which we don't care about here.
    return expect(res.map(p => p[1]), point.join(","));
  };

  it("should find all polygons that contain the point", () => {
    expectP([1, 1]).to.deep.equal([0]);
    expectP([8, 8]).to.deep.equal([0]);
    expectP([10, 8]).to.deep.equal([1]);
    expectP([12, 8]).to.deep.equal([2]);
    expectP([26, 15]).to.deep.equal([4]);
  });

  it("should slightly enlarge polygons to avoid gaps made by rounding", () => {
    // These points become ties with the enlarging in place.
    expectP([10, 0]).to.have.length(2);
    expectP([25, 15]).to.have.length(4);
  });
});
