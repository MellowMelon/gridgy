// @flow

import {describe, it} from "mocha";
import {expect} from "chai";
import {gen} from "mocha-testcheck";

import Tesselation from "../src/Tesselation.js";
import doFindElTests from "./_doFindElTests.js";

describe("Tesselation", () => {
  // Some of the below do not use regular shapes and instead approximate to
  // integer coordinates.

  const tSquareArgs = {
    periodMatrix: [1, 0, 0, 1],
    faceVerticesTable: {
      "0": [[0, 0, "0"], [1, 0, "0"], [1, 1, "0"], [0, 1, "0"]],
    },
    vertexCoordinatesTable: {"0": [0, 0]},
  };
  const tSquare = new Tesselation(tSquareArgs);

  const tHex = new Tesselation({
    periodMatrix: [4, 2, 0, 3],
    faceVerticesTable: {
      "0": [
        [0, 0, "0"],
        [0, 0, "1"],
        [1, 0, "0"],
        [0, 1, "1"],
        [0, 1, "0"],
        [-1, 1, "1"],
      ],
    },
    vertexCoordinatesTable: {"0": [0, 0], "1": [2, -1]},
  });

  const tTri = new Tesselation({
    periodMatrix: [2, 1, 0, 2],
    faceVerticesTable: {
      "0": [[0, 0, "0"], [1, 0, "0"], [0, 1, "0"]],
      "1": [[1, 0, "0"], [1, 1, "0"], [0, 1, "0"]],
    },
    vertexCoordinatesTable: {"0": [0, 0]},
  });

  const tOctagon = new Tesselation({
    periodMatrix: [4, 2, 0, 2],
    faceVerticesTable: {
      "0": [
        [0, 0, "0"],
        [0, 0, "1"],
        [0, 0, "2"],
        [0, 0, "3"],
        [0, 1, "1"],
        [0, 1, "0"],
        [-1, 1, "3"],
        [-1, 1, "2"],
      ],
      "1": [[0, 0, "3"], [1, 0, "0"], [0, 1, "2"], [0, 1, "1"]],
    },
    vertexCoordinatesTable: {
      "0": [0, 0],
      "1": [1, -1],
      "2": [2, -1],
      "3": [3, 0],
    },
  });

  // This one has a period with no 0s, which complicates mouse detection.

  const tSkewedSquare = new Tesselation({
    periodMatrix: [2, 1, 1, 2],
    faceVerticesTable: {
      "0": [[0, 0, "0"], [1, 0, "0"], [1, 1, "0"], [0, 1, "0"]],
    },
    vertexCoordinatesTable: {"0": [0, 0]},
  });

  // These next few are used to verify tricky edge-collapsing computations.

  // Vertices and faces are offset from each other.
  const tSquareShifted = new Tesselation({
    periodMatrix: [1, 0, 0, 1],
    faceVerticesTable: {
      "0": [[2, 4, "0"], [3, 4, "0"], [3, 5, "0"], [2, 5, "0"]],
    },
    vertexCoordinatesTable: {"0": [0, 0]},
  });
  // Alternating columns of squares, so some edges have one face.
  const tSquareStripe = new Tesselation({
    periodMatrix: [2, 0, 0, 1],
    faceVerticesTable: {
      "0": [[0, 0, "0"], [0, 0, "1"], [0, 1, "1"], [0, 1, "0"]],
    },
    vertexCoordinatesTable: {"0": [0, 0], "1": [1, 0]},
  });

  const tTable = {
    square: tSquare,
    hex: tHex,
    tri: tTri,
    octagon: tOctagon,
    skewedSquare: tSkewedSquare,
    squareShifted: tSquareShifted,
    squareStripe: tSquareStripe,
  };

  describe("constructor", () => {
    // Suitable as an expect argument when checking for thrown errors. We're
    // intentionally making type errors, so we use any to suppress those.
    const construct = v => () => new Tesselation((v: any));

    it("should error helpfully when the first parameter is falsy", () => {
      const message = "first parameter must be an object";
      expect(construct(), "undefined").to.throw(Error, message);
      expect(construct(null), "null").to.throw(Error, message);
      expect(construct(false), "false").to.throw(Error, message);
    });

    it("should error helpfully when the period matrix is wrong", () => {
      const constructPeriod = m => construct({periodMatrix: m});
      const message = "must pass array of 4 numbers for periodMatrix";
      expect(constructPeriod({a: 1})).to.throw(Error, message);
      expect(constructPeriod([1, 1, 1, 1, 1])).to.throw(Error, message);
      expect(constructPeriod([1, 1, 1, "2"])).to.throw(Error, message);
      expect(constructPeriod([1, 1, 1, NaN])).to.throw(Error, message);
    });

    it("should error helpfully when faceVerticesTable is wrong", () => {
      const constructFV = fv =>
        construct({
          periodMatrix: [1, 0, 0, 1],
          faceVerticesTable: fv,
          vertexCoordinatesTable: {"0": [0, 0]},
        });
      expect(constructFV(null)).to.throw(
        Error,
        "must pass an object for faceVerticesTable"
      );
      expect(constructFV({"0": "1"})).to.throw(
        Error,
        "all values of faceVerticesTable must be arrays; check face 0"
      );
      expect(
        constructFV({"0": [[1, 1, "0"]], "1": [[1, 1, "0"], [1, 1]]})
      ).to.throw(Error, "[number, number, vertexID]; check face 1 #2");
      expect(
        constructFV({"0": [[1, 1, "0"]], "1": [[1, "0", "0"], [1, 1, "0"]]})
      ).to.throw(Error, "[number, number, vertexID]; check face 1 #1");
      expect(constructFV({"0": [[1, 1, "0"]], "1": [[1, 1, "1"]]})).to.throw(
        Error,
        "must be in vertexCoordinatesTable; check face 1 #1"
      );
    });

    it("should error helpfully when vertexCoordinatesTable is wrong", () => {
      const constructVC = vc =>
        construct({
          periodMatrix: [1, 0, 0, 1],
          faceVerticesTable: {},
          vertexCoordinatesTable: vc,
        });
      expect(constructVC(null)).to.throw(
        Error,
        "must pass an object for vertexCoordinatesTable"
      );
      expect(constructVC({"0": [0, 0], "1": "1"})).to.throw(
        Error,
        "must be [number, number]; check vertex 1"
      );
      expect(constructVC({"0": [0, 0], "2": [1, 1, 1]})).to.throw(
        Error,
        "must be [number, number]; check vertex 2"
      );
      expect(constructVC({"0": [0, 0], "3": [1, NaN]})).to.throw(
        Error,
        "must be [number, number]; check vertex 3"
      );
    });
  });

  describe("getVerticesOnFace", () => {
    const expectVOnF = function(tName, face) {
      return expect(
        tTable[tName].getVerticesOnFace(face),
        tName + " " + face.join(",")
      );
    };

    it("should match the function passed to the constructor", () => {
      expectVOnF("square", [0, 0, "0"]).to.deep.equal([
        [0, 0, "0"],
        [1, 0, "0"],
        [1, 1, "0"],
        [0, 1, "0"],
      ]);
      expectVOnF("square", [2, 4, "0"]).to.deep.equal([
        [2, 4, "0"],
        [3, 4, "0"],
        [3, 5, "0"],
        [2, 5, "0"],
      ]);
      expectVOnF("tri", [2, 4, "0"]).to.deep.equal([
        [2, 4, "0"],
        [3, 4, "0"],
        [2, 5, "0"],
      ]);
      expectVOnF("tri", [2, 4, "1"]).to.deep.equal([
        [3, 4, "0"],
        [3, 5, "0"],
        [2, 5, "0"],
      ]);
    });

    it("should throw if given a bad face", () => {
      expect(() => tSquare.getVerticesOnFace([0, 0, "1"])).to.throw(
        Error,
        "Invalid face 0,0,1"
      );
    });
  });

  describe("getEdgesOnFace", () => {
    const expectEOnF = function(tName, face) {
      return expect(
        tTable[tName].getEdgesOnFace(face),
        tName + " " + face.join(",")
      );
    };

    it("should return the edges on the face", () => {
      expectEOnF("square", [0, 0, "0"]).to.deep.equal([
        [0, 0, 0, "0"],
        [1, 0, 3, "0"],
        [0, 1, 0, "0"],
        [0, 0, 3, "0"],
      ]);
      expectEOnF("square", [2, 4, "0"]).to.deep.equal([
        [2, 4, 0, "0"],
        [3, 4, 3, "0"],
        [2, 5, 0, "0"],
        [2, 4, 3, "0"],
      ]);
      expectEOnF("tri", [2, 4, "0"]).to.deep.equal([
        [2, 4, 0, "0"],
        [2, 4, 2, "1"],
        [2, 4, 2, "0"],
      ]);
      expectEOnF("tri", [2, 4, "1"]).to.deep.equal([
        [3, 4, 2, "0"],
        [2, 5, 0, "0"],
        [2, 4, 2, "1"],
      ]);
    });

    it("should throw if given a bad face", () => {
      expect(() => tSquare.getEdgesOnFace([0, 0, "1"])).to.throw(
        Error,
        "Invalid face 0,0,1"
      );
    });

    it("should correctly identify edges when the vertices are offset", () => {
      expectEOnF("squareShifted", [0, 0, "0"]).to.deep.equal([
        [0, 0, 0, "0"],
        [1, 0, 3, "0"],
        [0, 1, 0, "0"],
        [0, 0, 3, "0"],
      ]);
    });

    it("should correctly identify edges when some have only one face", () => {
      expectEOnF("squareStripe", [0, 0, "0"]).to.deep.equal([
        [0, 0, 0, "0"],
        [0, 0, 1, "0"],
        [0, 1, 0, "0"],
        [0, 0, 3, "0"],
      ]);
    });
  });

  describe("getFacesOnEdge", () => {
    const expectFOnE = function(tName, edge) {
      return expect(
        tTable[tName].getFacesOnEdge(edge),
        tName + " " + edge.join(",")
      );
    };

    // This is the hardest of the 6 getXOnY methods, so we test it thoroughly.
    it("should return the faces on the edge", () => {
      expectFOnE("square", [0, 0, 0, "0"]).to.deep.equal([
        [0, -1, "0"],
        [0, 0, "0"],
      ]);
      expectFOnE("square", [2, 4, 0, "0"]).to.deep.equal([
        [2, 3, "0"],
        [2, 4, "0"],
      ]);
      expectFOnE("square", [2, 4, 1, "0"]).to.deep.equal([
        [2, 4, "0"],
        [3, 4, "0"],
      ]);
      expectFOnE("square", [2, 4, 2, "0"]).to.deep.equal([
        [2, 4, "0"],
        [2, 5, "0"],
      ]);
      expectFOnE("square", [2, 4, 3, "0"]).to.deep.equal([
        [1, 4, "0"],
        [2, 4, "0"],
      ]);
      expectFOnE("tri", [2, 4, 1, "0"]).to.deep.equal([
        [2, 4, "0"],
        [2, 4, "1"],
      ]);
      expectFOnE("tri", [2, 4, 1, "1"]).to.deep.equal([
        [2, 4, "1"],
        [2, 5, "0"],
      ]);
      expectFOnE("octagon", [2, 4, 0, "0"]).to.deep.equal([
        [2, 3, "0"],
        [2, 4, "0"],
      ]);
      expectFOnE("octagon", [2, 4, 1, "0"]).to.deep.equal([
        [2, 3, "1"],
        [2, 4, "0"],
      ]);
      expectFOnE("octagon", [2, 4, 2, "0"]).to.deep.equal([
        [2, 4, "0"],
        [3, 3, "0"],
      ]);
      expectFOnE("octagon", [2, 4, 3, "0"]).to.deep.equal([
        [2, 4, "0"],
        [2, 4, "1"],
      ]);
      expectFOnE("octagon", [2, 4, 4, "0"]).to.deep.equal([
        [2, 4, "0"],
        [2, 5, "0"],
      ]);
      expectFOnE("octagon", [2, 4, 5, "0"]).to.deep.equal([
        [1, 5, "1"],
        [2, 4, "0"],
      ]);
      expectFOnE("octagon", [2, 4, 6, "0"]).to.deep.equal([
        [1, 5, "0"],
        [2, 4, "0"],
      ]);
      expectFOnE("octagon", [2, 4, 7, "0"]).to.deep.equal([
        [1, 4, "1"],
        [2, 4, "0"],
      ]);
      expectFOnE("octagon", [2, 4, 0, "1"]).to.deep.equal([
        [2, 4, "1"],
        [3, 3, "0"],
      ]);
      expectFOnE("octagon", [2, 4, 1, "1"]).to.deep.equal([
        [2, 4, "1"],
        [3, 4, "0"],
      ]);
      expectFOnE("octagon", [2, 4, 2, "1"]).to.deep.equal([
        [2, 4, "1"],
        [2, 5, "0"],
      ]);
      expectFOnE("octagon", [2, 4, 3, "1"]).to.deep.equal([
        [2, 4, "0"],
        [2, 4, "1"],
      ]);
      expectFOnE("squareStripe", [2, 4, 0, "0"]).to.deep.equal([
        [2, 3, "0"],
        [2, 4, "0"],
      ]);
      expectFOnE("squareStripe", [2, 4, 1, "0"]).to.deep.equal([[2, 4, "0"]]);
    });

    it("should throw if given a bad edge", () => {
      expect(() => tSquare.getFacesOnEdge([0, 0, 0, "1"])).to.throw(
        Error,
        "Invalid edge 0,0,0,1"
      );
    });
  });

  describe("getVerticesOnEdge", () => {
    const expectVOnE = function(tName, edge) {
      return expect(
        tTable[tName].getVerticesOnEdge(edge),
        tName + " " + edge.join(",")
      );
    };

    it("should return the vertices on the edge", () => {
      expectVOnE("square", [0, 0, 0, "0"]).to.deep.equal([
        [0, 0, "0"],
        [1, 0, "0"],
      ]);
      expectVOnE("square", [2, 4, 0, "0"]).to.deep.equal([
        [2, 4, "0"],
        [3, 4, "0"],
      ]);
      expectVOnE("tri", [2, 4, 1, "0"]).to.deep.equal([
        [3, 4, "0"],
        [2, 5, "0"],
      ]);
      expectVOnE("tri", [2, 4, 1, "1"]).to.deep.equal([
        [3, 5, "0"],
        [2, 5, "0"],
      ]);
      expectVOnE("squareStripe", [2, 4, 0, "0"]).to.deep.equal([
        [2, 4, "0"],
        [2, 4, "1"],
      ]);
      expectVOnE("squareStripe", [2, 4, 1, "0"]).to.deep.equal([
        [2, 4, "1"],
        [2, 5, "1"],
      ]);
    });

    it("should throw if given a bad edge", () => {
      expect(() => tSquare.getVerticesOnEdge([0, 0, 0, "1"])).to.throw(
        Error,
        "Invalid edge 0,0,0,1"
      );
    });
  });

  describe("getFacesOnVertex", () => {
    const expectFOnV = function(tName, vertex) {
      return expect(
        tTable[tName].getFacesOnVertex(vertex),
        tName + " " + vertex.join(",")
      );
    };

    // It's easy to have ordering issues, so we do more tests here.
    it("should return the faces on the vertex", () => {
      expectFOnV("square", [0, 0, "0"]).to.deep.equal([
        [0, 0, "0"],
        [-1, 0, "0"],
        [-1, -1, "0"],
        [0, -1, "0"],
      ]);
      expectFOnV("square", [2, 4, "0"]).to.deep.equal([
        [2, 4, "0"],
        [1, 4, "0"],
        [1, 3, "0"],
        [2, 3, "0"],
      ]);
      expectFOnV("tri", [2, 4, "0"]).to.deep.equal([
        [2, 4, "0"],
        [1, 4, "1"],
        [1, 4, "0"],
        [1, 3, "1"],
        [2, 3, "0"],
        [2, 3, "1"],
      ]);
      expectFOnV("hex", [2, 4, "0"]).to.deep.equal([
        [2, 4, "0"],
        [1, 4, "0"],
        [2, 3, "0"],
      ]);
      expectFOnV("hex", [2, 4, "1"]).to.deep.equal([
        [2, 4, "0"],
        [2, 3, "0"],
        [3, 3, "0"],
      ]);
      expectFOnV("octagon", [2, 4, "0"]).to.deep.equal([
        [2, 4, "0"],
        [1, 4, "1"],
        [2, 3, "0"],
      ]);
      expectFOnV("octagon", [2, 4, "1"]).to.deep.equal([
        [2, 4, "0"],
        [2, 3, "0"],
        [2, 3, "1"],
      ]);
      expectFOnV("octagon", [2, 4, "2"]).to.deep.equal([
        [2, 4, "0"],
        [2, 3, "1"],
        [3, 3, "0"],
      ]);
      expectFOnV("octagon", [2, 4, "3"]).to.deep.equal([
        [2, 4, "0"],
        [3, 3, "0"],
        [2, 4, "1"],
      ]);
      // Ordering less important here, since it's not a complete tesselation.
      expectFOnV("squareStripe", [2, 4, "0"]).to.deep.equal([
        [2, 4, "0"],
        [2, 3, "0"],
      ]);
      expectFOnV("squareStripe", [2, 4, "1"]).to.deep.equal([
        [2, 4, "0"],
        [2, 3, "0"],
      ]);
    });

    it("should throw if given a bad vertex", () => {
      expect(() => tSquare.getFacesOnVertex([0, 0, "1"])).to.throw(
        Error,
        "Invalid vertex 0,0,1"
      );
    });
  });

  describe("getEdgesOnVertex", () => {
    const expectEOnV = function(tName, vertex) {
      return expect(
        tTable[tName].getEdgesOnVertex(vertex),
        tName + " " + vertex.join(",")
      );
    };

    // It's easy to have ordering issues, so we do more tests here.
    it("should return the edges on the vertex", () => {
      expectEOnV("square", [0, 0, "0"]).to.deep.equal([
        [0, 0, 3, "0"],
        [-1, 0, 0, "0"],
        [0, -1, 3, "0"],
        [0, 0, 0, "0"],
      ]);
      expectEOnV("square", [2, 4, "0"]).to.deep.equal([
        [2, 4, 3, "0"],
        [1, 4, 0, "0"],
        [2, 3, 3, "0"],
        [2, 4, 0, "0"],
      ]);
      expectEOnV("tri", [2, 4, "0"]).to.deep.equal([
        [2, 4, 2, "0"],
        [1, 4, 2, "1"],
        [1, 4, 0, "0"],
        [2, 3, 2, "0"],
        [2, 3, 2, "1"],
        [2, 4, 0, "0"],
      ]);
      expectEOnV("hex", [2, 4, "0"]).to.deep.equal([
        [2, 4, 5, "0"],
        [2, 3, 4, "0"],
        [2, 4, 0, "0"],
      ]);
      expectEOnV("hex", [2, 4, "1"]).to.deep.equal([
        [2, 4, 0, "0"],
        [3, 3, 5, "0"],
        [3, 3, 4, "0"],
      ]);
      expectEOnV("octagon", [2, 4, "0"]).to.deep.equal([
        [2, 4, 7, "0"],
        [2, 3, 5, "0"],
        [2, 4, 0, "0"],
      ]);
      expectEOnV("octagon", [2, 4, "1"]).to.deep.equal([
        [2, 4, 0, "0"],
        [2, 3, 3, "1"],
        [2, 4, 1, "0"],
      ]);
      expectEOnV("octagon", [2, 4, "2"]).to.deep.equal([
        [2, 4, 1, "0"],
        [3, 3, 7, "0"],
        [3, 3, 6, "0"],
      ]);
      expectEOnV("octagon", [2, 4, "3"]).to.deep.equal([
        [3, 3, 6, "0"],
        [3, 3, 5, "0"],
        [2, 4, 3, "1"],
      ]);
      // Ordering less important here, since it's not a complete tesselation.
      expectEOnV("squareStripe", [2, 4, "0"]).to.deep.equal([
        [2, 4, 3, "0"],
        [2, 4, 0, "0"],
        [2, 3, 3, "0"],
      ]);
      expectEOnV("squareStripe", [2, 4, "1"]).to.deep.equal([
        [2, 4, 0, "0"],
        [2, 3, 1, "0"],
        [2, 4, 1, "0"],
      ]);
    });

    it("should throw if given a bad vertex", () => {
      expect(() => tSquare.getEdgesOnVertex([0, 0, "1"])).to.throw(
        Error,
        "Invalid vertex 0,0,1"
      );
    });
  });

  describe("getCanonicalEdge", () => {
    const expectCE = (tName, edge) => {
      return expect(
        tTable[tName].getCanonicalEdge(edge),
        tName + " " + edge.join(",")
      );
    };

    it("should return the edge identifier that other methods return", () => {
      expectCE("square", [0, 0, 0, "0"]).to.deep.equal([0, 0, 0, "0"]);
      expectCE("square", [0, -1, 2, "0"]).to.deep.equal([0, 0, 0, "0"]);
      expectCE("square", [0, 0, 1, "0"]).to.deep.equal([1, 0, 3, "0"]);
      expectCE("square", [1, 0, 3, "0"]).to.deep.equal([1, 0, 3, "0"]);

      expectCE("tri", [0, 0, 2, "1"]).to.deep.equal([0, 0, 2, "1"]);
      expectCE("tri", [0, 0, 1, "0"]).to.deep.equal([0, 0, 2, "1"]);

      expectCE("squareStripe", [0, 0, 1, "0"]).to.deep.equal([0, 0, 1, "0"]);
    });

    it("should not throw if used before any other incidence method", () => {
      const tSquare2 = new Tesselation(tSquareArgs);
      expect(tSquare2.getCanonicalEdge([0, 0, 0, "0"])).to.deep.equal([
        0,
        0,
        0,
        "0",
      ]);
    });
  });

  describe("isSameEdge", () => {
    const expectSame = (tName, e1, e2, expectedResult = true) => {
      return expect(
        tTable[tName].isSameEdge(e1, e2),
        tName + " " + e1.join(",") + " " + e2.join(",")
      ).to.equal(expectedResult);
    };
    const expectNotSame = (tName, e1, e2) => {
      return expectSame(tName, e1, e2, false);
    };

    it("should return true if the edges map to the same vertex pair", () => {
      expectSame("square", [0, 0, 0, "0"], [0, 0, 0, "0"]);
      expectSame("square", [0, 0, 0, "0"], [0, -1, 2, "0"]);
      expectSame("square", [0, -1, 2, "0"], [0, 0, 0, "0"]);
      expectSame("square", [0, -1, 2, "0"], [0, -1, 2, "0"]);

      expectNotSame("square", [0, 0, 0, "0"], [0, -1, 0, "0"]);
      expectSame("square", [0, 0, 1, "0"], [1, 0, 3, "0"]);
      expectSame("square", [0, 0, 2, "0"], [0, 1, 0, "0"]);
      expectSame("square", [0, 0, 3, "0"], [-1, 0, 1, "0"]);

      expectSame("square", [2, 4, 3, "0"], [1, 4, 1, "0"]);
      expectNotSame("square", [0, 0, 3, "0"], [1, 4, 1, "0"]);

      expectSame("tri", [0, 0, 1, "0"], [0, 0, 2, "1"]);
      expectSame("tri", [2, 4, 1, "0"], [2, 4, 2, "1"]);

      expectSame("squareStripe", [0, 0, 0, "0"], [0, -1, 2, "0"]);
      expectNotSame("squareStripe", [0, 0, 1, "0"], [1, 0, 3, "0"]);
    });
  });

  describe("getOtherFace", () => {
    const expectOtherF = (tName, f, e) => {
      return expect(
        tTable[tName].getOtherFace(f, e),
        tName + " " + f.join(",") + " " + e.join(",")
      );
    };

    it("should return null if the edge is not on the face", () => {
      expectOtherF("square", [0, 0, "0"], [1, 0, 1, "0"]).to.equal(null);
      expectOtherF("square", [3, 4, "0"], [2, 4, 0, "0"]).to.equal(null);
      expectOtherF("squareStripe", [2, 4, "0"], [3, 4, 3, "0"]).to.equal(null);
    });

    it("should return null if the edge has one face", () => {
      expectOtherF("squareStripe", [2, 4, "0"], [2, 4, 1, "0"]).to.equal(null);
    });

    it("should return the other face on the edge", () => {
      expectOtherF("square", [0, 0, "0"], [1, 0, 3, "0"]).to.deep.equal([
        1,
        0,
        "0",
      ]);
      expectOtherF("square", [1, 0, "0"], [1, 0, 3, "0"]).to.deep.equal([
        0,
        0,
        "0",
      ]);
      expectOtherF("square", [2, 4, "0"], [2, 5, 0, "0"]).to.deep.equal([
        2,
        5,
        "0",
      ]);
      expectOtherF("square", [2, 5, "0"], [2, 5, 0, "0"]).to.deep.equal([
        2,
        4,
        "0",
      ]);
      expectOtherF("octagon", [2, 4, "0"], [2, 4, 1, "0"]).to.deep.equal([
        2,
        3,
        "1",
      ]);
      expectOtherF("octagon", [2, 3, "1"], [2, 4, 1, "0"]).to.deep.equal([
        2,
        4,
        "0",
      ]);
    });
  });

  describe("getOtherVertex", () => {
    const expectOtherV = (tName, v, e) => {
      return expect(
        tTable[tName].getOtherVertex(v, e),
        tName + " " + v.join(",") + " " + e.join(",")
      );
    };

    it("should return null if the vertex is not on the edge", () => {
      expectOtherV("square", [0, 0, "0"], [0, 0, 1, "0"]).to.equal(null);
      expectOtherV("square", [3, 4, "0"], [2, 4, 2, "0"]).to.equal(null);
      expectOtherV("squareStripe", [2, 4, "0"], [1, 4, 1, "0"]).to.equal(null);
    });

    it("should return the other vertex on the edge", () => {
      expectOtherV("square", [0, 0, "0"], [0, 0, 0, "0"]).to.deep.equal([
        1,
        0,
        "0",
      ]);
      expectOtherV("square", [1, 0, "0"], [0, 0, 0, "0"]).to.deep.equal([
        0,
        0,
        "0",
      ]);
      expectOtherV("square", [2, 4, "0"], [2, 4, 3, "0"]).to.deep.equal([
        2,
        5,
        "0",
      ]);
      expectOtherV("square", [2, 5, "0"], [2, 4, 3, "0"]).to.deep.equal([
        2,
        4,
        "0",
      ]);
      expectOtherV("octagon", [2, 4, "1"], [2, 3, 3, "0"]).to.deep.equal([
        2,
        3,
        "3",
      ]);
      expectOtherV("octagon", [2, 3, "3"], [2, 3, 3, "0"]).to.deep.equal([
        2,
        4,
        "1",
      ]);
    });
  });

  describe("getAdjacentFaces", () => {
    const expectAdj = (tName, f) => {
      return expect(
        tTable[tName].getAdjacentFaces(f),
        tName + " " + f.join(",")
      );
    };

    it("should return all faces with a common edge", () => {
      expectAdj("square", [0, 0, "0"]).to.deep.equal([
        [0, -1, "0"],
        [1, 0, "0"],
        [0, 1, "0"],
        [-1, 0, "0"],
      ]);
      expectAdj("square", [2, 4, "0"]).to.deep.equal([
        [2, 3, "0"],
        [3, 4, "0"],
        [2, 5, "0"],
        [1, 4, "0"],
      ]);
      expectAdj("octagon", [2, 4, "0"]).to.deep.equal([
        [2, 3, "0"],
        [2, 3, "1"],
        [3, 3, "0"],
        [2, 4, "1"],
        [2, 5, "0"],
        [1, 5, "1"],
        [1, 5, "0"],
        [1, 4, "1"],
      ]);
      expectAdj("octagon", [2, 4, "1"]).to.deep.equal([
        [3, 3, "0"],
        [3, 4, "0"],
        [2, 5, "0"],
        [2, 4, "0"],
      ]);
      expectAdj("squareStripe", [2, 4, "0"]).to.deep.equal([
        [2, 3, "0"],
        [2, 5, "0"],
      ]);
    });
  });

  describe("getAdjacentVertices", () => {
    const expectAdj = (tName, v) => {
      return expect(
        tTable[tName].getAdjacentVertices(v),
        tName + " " + v.join(",")
      );
    };

    it("should return all vertices with a common edge", () => {
      expectAdj("square", [0, 0, "0"]).to.deep.equal([
        [0, 1, "0"],
        [-1, 0, "0"],
        [0, -1, "0"],
        [1, 0, "0"],
      ]);
      expectAdj("square", [2, 4, "0"]).to.deep.equal([
        [2, 5, "0"],
        [1, 4, "0"],
        [2, 3, "0"],
        [3, 4, "0"],
      ]);
      expectAdj("octagon", [2, 4, "0"]).to.deep.equal([
        [1, 5, "2"],
        [1, 4, "3"],
        [2, 4, "1"],
      ]);
      expectAdj("octagon", [2, 4, "1"]).to.deep.equal([
        [2, 4, "0"],
        [2, 3, "3"],
        [2, 4, "2"],
      ]);
      expectAdj("squareStripe", [2, 4, "0"]).to.deep.equal([
        [2, 5, "0"],
        [2, 4, "1"],
        [2, 3, "0"],
      ]);
    });
  });

  describe("getTouchingFaces", () => {
    const expectTouch = (tName, f) => {
      return expect(
        tTable[tName].getTouchingFaces(f),
        tName + " " + f.join(",")
      );
    };

    // Order is arbitrary (but consistent)
    it("should return all faces with a common vertex", () => {
      expectTouch("square", [0, 0, "0"]).to.deep.equal([
        [-1, 0, "0"],
        [-1, -1, "0"],
        [0, -1, "0"],
        [1, 0, "0"],
        [1, -1, "0"],
        [1, 1, "0"],
        [0, 1, "0"],
        [-1, 1, "0"],
      ]);
      expectTouch("square", [2, 4, "0"]).to.deep.equal([
        [1, 4, "0"],
        [1, 3, "0"],
        [2, 3, "0"],
        [3, 4, "0"],
        [3, 3, "0"],
        [3, 5, "0"],
        [2, 5, "0"],
        [1, 5, "0"],
      ]);
      expectTouch("hex", [2, 4, "0"]).to.deep.equal([
        [1, 4, "0"],
        [2, 3, "0"],
        [3, 3, "0"],
        [3, 4, "0"],
        [2, 5, "0"],
        [1, 5, "0"],
      ]);
      expectTouch("squareStripe", [2, 4, "0"]).to.deep.equal([
        [2, 3, "0"],
        [2, 5, "0"],
      ]);
    });
  });

  describe("getTouchingEdges", () => {
    const expectTouch = (tName, e) => {
      return expect(
        tTable[tName].getTouchingEdges(e),
        tName + " " + e.join(",")
      );
    };

    // Order is arbitrary (but consistent)
    it("should return all edges with a common vertex", () => {
      expectTouch("square", [0, 0, 0, "0"]).to.deep.equal([
        [0, 0, 3, "0"],
        [-1, 0, 0, "0"],
        [0, -1, 3, "0"],
        [1, 0, 3, "0"],
        [1, -1, 3, "0"],
        [1, 0, 0, "0"],
      ]);
      // [2,4,0,1] is not the canonical form, and said canonical form [3,4,0,3]
      // should not be included in this array.
      expectTouch("square", [2, 4, 1, "0"]).to.deep.equal([
        [2, 4, 0, "0"],
        [3, 3, 3, "0"],
        [3, 4, 0, "0"],
        [3, 5, 3, "0"],
        [2, 5, 0, "0"],
        [3, 5, 0, "0"],
      ]);
      expectTouch("hex", [2, 4, 0, "0"]).to.deep.equal([
        [2, 4, 5, "0"],
        [2, 3, 4, "0"],
        [3, 3, 5, "0"],
        [3, 3, 4, "0"],
      ]);
      expectTouch("squareStripe", [2, 4, 0, "0"]).to.deep.equal([
        [2, 4, 3, "0"],
        [2, 3, 3, "0"],
        [2, 3, 1, "0"],
        [2, 4, 1, "0"],
      ]);
    });
  });

  describe("getSurroundingEdges", () => {
    const expectSurr = (tName, e) => {
      return expect(
        tTable[tName].getSurroundingEdges(e),
        tName + " " + e.join(",")
      );
    };

    // Order is arbitrary (but consistent)
    it("should return all edges with a common face", () => {
      expectSurr("square", [0, 0, 0, "0"]).to.deep.equal([
        [0, -1, 0, "0"],
        [1, -1, 3, "0"],
        [0, -1, 3, "0"],
        [1, 0, 3, "0"],
        [0, 1, 0, "0"],
        [0, 0, 3, "0"],
      ]);
      // [2,4,0,1] is not the canonical form, and said canonical form [3,4,0,3]
      // should not be included in this array.
      expectSurr("square", [2, 4, 1, "0"]).to.deep.equal([
        [2, 4, 0, "0"],
        [2, 5, 0, "0"],
        [2, 4, 3, "0"],
        [3, 4, 0, "0"],
        [4, 4, 3, "0"],
        [3, 5, 0, "0"],
      ]);
      expectSurr("hex", [2, 4, 0, "0"]).to.deep.equal([
        [2, 3, 0, "0"],
        [3, 2, 4, "0"],
        [3, 3, 5, "0"],
        [2, 3, 4, "0"],
        [2, 3, 5, "0"],
        [3, 3, 4, "0"],
        [3, 4, 5, "0"],
        [2, 5, 0, "0"],
        [2, 4, 4, "0"],
        [2, 4, 5, "0"],
      ]);
      expectSurr("squareStripe", [2, 4, 0, "0"]).to.deep.equal([
        [2, 3, 0, "0"],
        [2, 3, 1, "0"],
        [2, 3, 3, "0"],
        [2, 4, 1, "0"],
        [2, 5, 0, "0"],
        [2, 4, 3, "0"],
      ]);
    });
  });

  describe("getSurroundingVertices", () => {
    const expectSurr = (tName, v) => {
      return expect(
        tTable[tName].getSurroundingVertices(v),
        tName + " " + v.join(",")
      );
    };

    // Order is arbitrary (but consistent)
    it("should return all vertices with a common face", () => {
      expectSurr("square", [0, 0, "0"]).to.deep.equal([
        [1, 0, "0"],
        [1, 1, "0"],
        [0, 1, "0"],
        [-1, 0, "0"],
        [-1, 1, "0"],
        [-1, -1, "0"],
        [0, -1, "0"],
        [1, -1, "0"],
      ]);
      expectSurr("square", [2, 4, "0"]).to.deep.equal([
        [3, 4, "0"],
        [3, 5, "0"],
        [2, 5, "0"],
        [1, 4, "0"],
        [1, 5, "0"],
        [1, 3, "0"],
        [2, 3, "0"],
        [3, 3, "0"],
      ]);
      expectSurr("octagon", [2, 4, "0"]).to.deep.equal([
        [2, 4, "1"],
        [2, 4, "2"],
        [2, 4, "3"],
        [2, 5, "1"],
        [2, 5, "0"],
        [1, 5, "3"],
        [1, 5, "2"],
        [1, 4, "3"],
        [1, 5, "1"],
        [2, 3, "0"],
        [2, 3, "1"],
        [2, 3, "2"],
        [2, 3, "3"],
        [1, 4, "2"],
      ]);
      expectSurr("squareStripe", [2, 4, "0"]).to.deep.equal([
        [2, 4, "1"],
        [2, 5, "1"],
        [2, 5, "0"],
        [2, 3, "0"],
        [2, 3, "1"],
      ]);
    });
  });

  describe("getFaceCoordinates", () => {
    const expectFaceC = (tName, f) => {
      return expect(
        tTable[tName].getFaceCoordinates(f),
        tName + " " + f.join(",")
      );
    };

    it("should return the coordinates of each vertex on the face", () => {
      expectFaceC("square", [0, 0, "0"]).to.deep.equal([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ]);
      expectFaceC("square", [2, 4, "0"]).to.deep.equal([
        [2, 4],
        [3, 4],
        [3, 5],
        [2, 5],
      ]);
      expectFaceC("tri", [2, 4, "1"]).to.deep.equal([
        [10, 8],
        [11, 10],
        [9, 10],
      ]);
      expectFaceC("octagon", [2, 4, "0"]).to.deep.equal([
        [16, 8],
        [17, 7],
        [18, 7],
        [19, 8],
        [19, 9],
        [18, 10],
        [17, 10],
        [16, 9],
      ]);
      expectFaceC("squareShifted", [0, 0, "0"]).to.deep.equal([
        [2, 4],
        [3, 4],
        [3, 5],
        [2, 5],
      ]);
      expectFaceC("squareStripe", [2, 4, "0"]).to.deep.equal([
        [4, 4],
        [5, 4],
        [5, 5],
        [4, 5],
      ]);
    });
  });

  describe("getEdgeCoordinates", () => {
    const expectEdgeC = (tName, e) => {
      return expect(
        tTable[tName].getEdgeCoordinates(e),
        tName + " " + e.join(",")
      );
    };

    it("should return the coordinates of each vertex on the face", () => {
      expectEdgeC("square", [0, 0, 0, "0"]).to.deep.equal([[0, 0], [1, 0]]);
      expectEdgeC("square", [2, 4, 1, "0"]).to.deep.equal([[3, 4], [3, 5]]);
      expectEdgeC("tri", [2, 4, 2, "1"]).to.deep.equal([[9, 10], [10, 8]]);
      expectEdgeC("octagon", [2, 4, 3, "0"]).to.deep.equal([[19, 8], [19, 9]]);
      expectEdgeC("squareShifted", [0, 0, 0, "0"]).to.deep.equal([
        [2, 4],
        [3, 4],
      ]);
      expectEdgeC("squareStripe", [2, 4, 0, "0"]).to.deep.equal([
        [4, 4],
        [5, 4],
      ]);
    });
  });

  describe("getVertexCoordinates", () => {
    const expectVertexC = (tName, v) => {
      return expect(
        tTable[tName].getVertexCoordinates(v),
        tName + " " + v.join(",")
      );
    };

    it("should return the coordinates of each vertex on the face", () => {
      expectVertexC("square", [0, 0, "0"]).to.deep.equal([0, 0]);
      expectVertexC("square", [2, 4, "0"]).to.deep.equal([2, 4]);
      expectVertexC("hex", [2, 4, "1"]).to.deep.equal([18, 11]);
      expectVertexC("octagon", [2, 4, "2"]).to.deep.equal([18, 7]);
      expectVertexC("squareStripe", [2, 4, "0"]).to.deep.equal([4, 4]);
    });
  });

  describe("findFaceAt", () => {
    const expectFaceAt = (name, p) => {
      return expect(tTable[name].findFaceAt(p), name + " " + p.join(","));
    };

    // A few explicit tests just to sanity check, before the generative ones.
    it("should return the face located at the point", () => {
      expectFaceAt("square", [1.5, 1.5]).to.deep.equal([1, 1, "0"]);
      expectFaceAt("square", [2.9, 4.1]).to.deep.equal([2, 4, "0"]);
      expectFaceAt("octagon", [10.9, 0.1]).to.deep.equal([2, 0, "0"]);
      expectFaceAt("octagon", [10.9, -0.2]).to.deep.equal([3, -1, "0"]);
      expectFaceAt("octagon", [11.1, 0.1]).to.deep.equal([2, 0, "1"]);
      expectFaceAt("octagon", [11.1, -0.2]).to.deep.equal([3, -1, "0"]);
      expectFaceAt("squareStripe", [6.5, 1.5]).to.deep.equal([3, 1, "0"]);
    });

    it("should return null when there is no face", () => {
      expectFaceAt("squareStripe", [1.5, 0.5]).to.equal(null);
      expectFaceAt("squareStripe", [11.1, 123.4]).to.equal(null);
    });
  });

  describe("findEdgeAt", () => {
    const expectEdgeAt = (name, p) => {
      return expect(tTable[name].findEdgeAt(p), name + " " + p.join(","));
    };

    // A few explicit tests just to sanity check, before the generative ones.
    it("should return the edge closest to the point", () => {
      expectEdgeAt("square", [1.5, 1.2]).to.deep.equal([1, 1, 0, "0"]);
      expectEdgeAt("square", [2.9, 4.2]).to.deep.equal([3, 4, 3, "0"]);
      expectEdgeAt("octagon", [10.9, 0.2]).to.deep.equal([2, 0, 3, "1"]);
      expectEdgeAt("octagon", [10.9, -0.2]).to.deep.equal([3, -1, 6, "0"]);
      expectEdgeAt("octagon", [11.2, 0.1]).to.deep.equal([3, -1, 5, "0"]);
      expectEdgeAt("octagon", [11.2, -0.2]).to.deep.equal([3, -1, 5, "0"]);
      expectEdgeAt("squareStripe", [6.8, 1.5]).to.deep.equal([3, 1, 1, "0"]);
      expectEdgeAt("squareStripe", [7.2, 1.5]).to.deep.equal([3, 1, 1, "0"]);
    });
  });

  describe("findVertexAt", () => {
    const expectVertexAt = (name, p) => {
      return expect(tTable[name].findVertexAt(p), name + " " + p.join(","));
    };

    // A few explicit tests just to sanity check, before the generative ones.
    it("should return the vertex closest to the point", () => {
      expectVertexAt("square", [1.2, 1.2]).to.deep.equal([1, 1, "0"]);
      expectVertexAt("square", [2.6, 4.4]).to.deep.equal([3, 4, "0"]);
      expectVertexAt("octagon", [10.0, 0.1]).to.deep.equal([2, 0, "3"]);
      expectVertexAt("octagon", [10.0, -0.1]).to.deep.equal([2, 0, "2"]);
      expectVertexAt("octagon", [11.2, 0.6]).to.deep.equal([2, 1, "1"]);
      expectVertexAt("squareStripe", [6.8, 1.4]).to.deep.equal([3, 1, "1"]);
      expectVertexAt("squareStripe", [7.2, 1.6]).to.deep.equal([3, 2, "1"]);
    });
  });

  const genCompleteTessName = gen.oneOf([
    "square",
    "hex",
    "tri",
    "octagon",
    "skewedSquare",
  ]);
  doFindElTests(genCompleteTessName, name => tTable[name]);
});
