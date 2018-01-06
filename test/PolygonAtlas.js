// @flow

import {describe, it} from "mocha";
import {expect} from "chai";

import PolygonAtlas from "../src/PolygonAtlas.js";

describe("PolygonAtlas", () => {
  const t = new PolygonAtlas([0, 0, 100, 100]);

  for (let i = 0; i < 10; i += 1) {
    for (let j = 0; j < 10; j += 1) {
      t.addPolygon(
        [
          [2 + 10 * i, 2 + 10 * j],
          [12 + 10 * i, 2 + 10 * j],
          [12 + 10 * i, 12 + 10 * j],
        ],
        i + "," + j + ",u"
      );
      t.addPolygon(
        [
          [12 + 10 * i, 2 + 10 * j],
          [12 + 10 * i, 12 + 10 * j],
          [2 + 10 * i, 12 + 10 * j],
        ],
        i + "," + j + ",d"
      );
    }
  }

  const expectP = function(point) {
    // Using sort to enforce consistent ordering
    return expect(t.findPolygons(point).sort(), point.join(","));
  };

  it("should find all polygons that contain the point", () => {
    expectP([1, 1]).to.deep.equal([]);
    expectP([23, 28]).to.deep.equal([]);
    expectP([39, 43]).to.deep.equal([
      [[[32, 42], [42, 42], [42, 52]], "3,4,u"],
    ]);
    expectP([70, 21]).to.deep.equal([
      [[[72, 12], [72, 22], [62, 22]], "6,1,d"],
    ]);
    expectP([91, 95]).to.deep.equal([
      [[[82, 92], [92, 92], [92, 102]], "8,9,u"],
      [[[92, 92], [92, 102], [82, 102]], "8,9,d"],
    ]);
  });
});
