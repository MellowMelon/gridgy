// @flow

import {describe, it} from "mocha";
import {expect} from "chai";

import findFaceCover from "../src/findFaceCover.js";

describe("findFaceCover", () => {
  it("should return all faces intersecting the given rectangle", () => {
    const ret = findFaceCover(
      [-1, -1, 22, 12],
      [10, 0, 0, 10],
      [0],
      () => [[0, 0], [10, 0], [10, 10], [0, 10]],
      () => [] // Touching faces not needed in simple cases
    );
    // We don't care about the return order, so even if the default JS sort is
    // silly, it gives us the consistency we want.
    ret.sort();
    expect(ret).to.deep.equal([
      [-1, -1, 0],
      [-1, 0, 0],
      [-1, 1, 0],
      [0, -1, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, -1, 0],
      [1, 0, 0],
      [1, 1, 0],
      [2, -1, 0],
      [2, 0, 0],
      [2, 1, 0],
    ]);
  });

  it("should work with multiple faces in a period", () => {
    const ret = findFaceCover(
      [-1, -1, 12, 12],
      [20, 0, 0, 10],
      [0, 1],
      f =>
        f
          ? [[10, 0], [20, 0], [20, 10], [10, 10]]
          : [[0, 0], [10, 0], [10, 10], [0, 10]],
      () => []
    );
    ret.sort();
    expect(ret).to.deep.equal([
      [-1, -1, 1],
      [-1, 0, 1],
      [-1, 1, 1],
      [0, -1, 0],
      [0, -1, 1],
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 0],
      [0, 1, 1],
    ]);
  });

  it("should use rectangular approximations", () => {
    const ret = findFaceCover(
      [-1, -1, 2, 2],
      [10, 0, 0, 10],
      [0],
      () => [[0, 0], [10, 0], [0, 10]],
      () => []
    );
    ret.sort();
    // [-1, -1, 0]'s polygon does not intersect, but bounding rectangle does.
    expect(ret).to.deep.equal([[-1, -1, 0], [-1, 0, 0], [0, -1, 0], [0, 0, 0]]);
  });

  it("should use getTouchingFaces to deal with bizarre periods", () => {
    const ret = findFaceCover(
      [-1, -1, 2, 2],
      [50, 30, 30, 20],
      [0],
      () => [[0, 0], [10, 0], [10, 10], [0, 10]],
      () => [
        [1, -2, 0],
        [3, -5, 0],
        [5, -8, 0],
        [-2, 3, 0],
        [2, -3, 0],
        [-5, 8, 0],
        [-3, 5, 0],
        [-1, 2, 0],
      ]
    );
    ret.sort();
    expect(ret).to.deep.equal([[-2, 3, 0], [0, 0, 0], [1, -2, 0], [3, -5, 0]]);
  });

  it("should deal with tesselations that aren't complete", () => {
    const ret = findFaceCover(
      [-1, -1, 22, 12],
      [20, 0, 20, 20],
      [0],
      () => [[0, 0], [10, 0], [10, 10], [0, 10]],
      () => []
    );
    ret.sort();
    expect(ret).to.deep.equal([[0, 0, 0], [1, -1, 0]]);
  });
});
