// @flow

import {describe, it} from "mocha";
import {expect} from "chai";
import {gen} from "mocha-testcheck";

import Tesselation from "../src/Tesselation.js";
import Grid from "../src/Grid.js";
import doFindElTests from "./_doFindElTests.js";

describe("Grid", () => {
  const tSquareArgs = {
    periodMatrix: [1, 0, 0, 1],
    faceVerticesTable: {
      "0": [[0, 0, "0"], [1, 0, "0"], [1, 1, "0"], [0, 1, "0"]],
    },
    vertexCoordinatesTable: {"0": [0, 0]},
  };
  const tSquare = new Tesselation(tSquareArgs);

  const coordArgs = {
    origin: [30, 10],
    scale: 20,
  };
  const customNameArgs = {
    fromFaceTessKey: k => "F," + k[0] + "," + k[1],
    fromEdgeTessKey: k => "E," + k[0] + "," + k[1] + "," + (k[2] ? "v" : "h"),
    fromVertexTessKey: k => "V," + k[0] + "," + k[1],
    toFaceTessKey: k => {
      const parts = k.split(",");
      return [parseInt(parts[1]), parseInt(parts[2]), "0"];
    },
    toEdgeTessKey: k => {
      const parts = k.split(",");
      return [
        parseInt(parts[1]),
        parseInt(parts[2]),
        parts[3] === "v" ? 3 : 0,
        "0",
      ];
    },
    toVertexTessKey: k => {
      const parts = k.split(",");
      return [parseInt(parts[1]), parseInt(parts[2]), "0"];
    },
  };

  const facesTwo = ["f,0,0,0", "f,1,0,0", "f,0,1,0", "f,1,1,0"];
  const gTwo = new Grid({
    tesselation: tSquare,
    faceList: facesTwo,
    ...coordArgs,
  });

  const gTwoCustomNames = new Grid({
    tesselation: tSquare,
    faceList: ["F,0,0", "F,1,0", "F,0,1", "F,1,1"],
    ...coordArgs,
    ...customNameArgs,
  });

  const gTwoUnshifted = new Grid({
    tesselation: tSquare,
    faceList: facesTwo,
  });

  const facesThree = [
    "f,0,0,0",
    "f,1,0,0",
    "f,2,0,0",
    "f,0,1,0",
    "f,1,1,0",
    "f,2,1,0",
    "f,0,2,0",
    "f,1,2,0",
    "f,2,2,0",
  ];
  const gThree = new Grid({
    tesselation: tSquare,
    faceList: facesThree,
    ...coordArgs,
  });

  const facesU = ["f,0,0,0", "f,1,0,0", "f,2,0,0", "f,0,1,0", "f,2,1,0"];
  const gUPentomino = new Grid({
    tesselation: tSquare,
    faceList: facesU,
    ...coordArgs,
  });

  const gTable = {
    "2": gTwo,
    "3": gThree,
    U: gUPentomino,
  };

  describe("constructor", () => {
    // Suitable as an expect argument when checking for thrown errors. We're
    // intentionally making type errors, so we use any to suppress those.
    const construct = v => () => new Grid((v: any));

    it("should error when the first parameter is falsy", () => {
      expect(construct(), "undefined").to.throw(
        Error,
        "first parameter must be an object"
      );
      expect(construct(null), "null").to.throw(
        Error,
        "first parameter must be an object"
      );
      expect(construct(false), "false").to.throw(
        Error,
        "first parameter must be an object"
      );
    });

    it("should error when the parameter has no tesselation or faceList", () => {
      expect(construct({faceList: []}), "missing tesselation").to.throw(
        Error,
        "must pass tesselation"
      );
      expect(construct({tesselation: tSquare}), "missing faceList").to.throw(
        Error,
        "must pass faceList"
      );
    });
  });

  describe("getFaceList", () => {
    it("should return the same thing as the passed faceList", () => {
      expect(gTwo.getFaceList(), "2").to.deep.equal(facesTwo);
      expect(gThree.getFaceList(), "3").to.deep.equal(facesThree);
      expect(gUPentomino.getFaceList(), "U").to.deep.equal(facesU);
    });

    it("should use custom names provided in the constructor", () => {
      expect(gTwoCustomNames.getFaceList()).to.deep.equal([
        "F,0,0",
        "F,1,0",
        "F,0,1",
        "F,1,1",
      ]);
    });
  });

  describe("getEdgeList", () => {
    it("should return all edges without duplicates", () => {
      // Order is undefined, so using sort to enforce consistency in test
      expect(gTwo.getEdgeList().sort()).to.deep.equal([
        "e,0,0,0,0",
        "e,0,0,3,0",
        "e,0,1,0,0",
        "e,0,1,3,0",
        "e,0,2,0,0",
        "e,1,0,0,0",
        "e,1,0,3,0",
        "e,1,1,0,0",
        "e,1,1,3,0",
        "e,1,2,0,0",
        "e,2,0,3,0",
        "e,2,1,3,0",
      ]);
    });

    it("should use custom names provided in the constructor", () => {
      expect(gTwoCustomNames.getEdgeList().sort()).to.deep.equal([
        "E,0,0,h",
        "E,0,0,v",
        "E,0,1,h",
        "E,0,1,v",
        "E,0,2,h",
        "E,1,0,h",
        "E,1,0,v",
        "E,1,1,h",
        "E,1,1,v",
        "E,1,2,h",
        "E,2,0,v",
        "E,2,1,v",
      ]);
    });
  });

  describe("getVertexList", () => {
    it("should return all vertices without duplicates", () => {
      // Order is undefined, so using sort to enforce consistency in test
      expect(gUPentomino.getVertexList().sort()).to.deep.equal([
        "v,0,0,0",
        "v,0,1,0",
        "v,0,2,0",
        "v,1,0,0",
        "v,1,1,0",
        "v,1,2,0",
        "v,2,0,0",
        "v,2,1,0",
        "v,2,2,0",
        "v,3,0,0",
        "v,3,1,0",
        "v,3,2,0",
      ]);
    });

    it("should use custom names provided in the constructor", () => {
      expect(gTwoCustomNames.getVertexList().sort()).to.deep.equal([
        "V,0,0",
        "V,0,1",
        "V,0,2",
        "V,1,0",
        "V,1,1",
        "V,1,2",
        "V,2,0",
        "V,2,1",
        "V,2,2",
      ]);
    });
  });

  describe("hasFace", () => {
    const expectHasF = function(gName, face) {
      return expect(gTable[gName].hasFace(face), gName + " " + face);
    };

    it("should return whether the face is in the geometry", () => {
      expectHasF(2, "f,0,0,0").to.equal(true);
      expectHasF(2, "f,1,1,0").to.equal(true);
      expectHasF(2, "f,2,0,0").to.equal(false);
      expectHasF(2, "v,0,0,0").to.equal(false);
      expectHasF(2, "bad").to.equal(false);
    });
  });

  describe("hasEdge", () => {
    const expectHasE = function(gName, edge) {
      return expect(gTable[gName].hasEdge(edge), gName + " " + edge);
    };

    it("should return whether the edge is in the geometry", () => {
      expectHasE(2, "e,0,0,0,0").to.equal(true);
      expectHasE(2, "e,1,1,3,0").to.equal(true);
      expectHasE(2, "e,2,0,0,0").to.equal(false);
      expectHasE(2, "e,0,0,0").to.equal(false);
      expectHasE(2, "f,0,0,0").to.equal(false);
      expectHasE(2, "bad").to.equal(false);
    });
  });

  describe("hasVertex", () => {
    const expectHasV = function(gName, vertex) {
      return expect(gTable[gName].hasVertex(vertex), gName + " " + vertex);
    };

    it("should return whether the vertex is in the geometry", () => {
      expectHasV(2, "v,0,0,0").to.equal(true);
      expectHasV(2, "v,2,2,0").to.equal(true);
      expectHasV(2, "v,3,0,0").to.equal(false);
      expectHasV(2, "f,0,0,0").to.equal(false);
      expectHasV(2, "bad").to.equal(false);
    });
  });

  describe("getEdgesOnFace", () => {
    const verify = function(gName, face) {
      const tessFace = gTable[gName].toFaceTessKey(face);
      const tessEdges = tSquare.getEdgesOnFace(tessFace);
      const expEdges = tessEdges.map(el => gTable[gName].fromEdgeTessKey(el));
      return expect(
        gTable[gName].getEdgesOnFace(face),
        gName + " " + face
      ).to.deep.equal(expEdges);
    };

    it("should be based on the tesselation method", () => {
      verify(2, "f,0,0,0");
      verify("U", "f,1,2,0");
    });
  });

  describe("getVerticesOnFace", () => {
    const verify = function(gName, face) {
      const tessFace = gTable[gName].toFaceTessKey(face);
      const tessVertices = tSquare.getVerticesOnFace(tessFace);
      const expVertices = tessVertices.map(el =>
        gTable[gName].fromVertexTessKey(el)
      );
      return expect(
        gTable[gName].getVerticesOnFace(face),
        gName + " " + face
      ).to.deep.equal(expVertices);
    };

    it("should be based on the tesselation method", () => {
      verify(2, "f,0,0,0");
      verify("U", "f,1,2,0");
    });
  });

  describe("getFacesOnEdge", () => {
    const verify = function(gName, edge) {
      const tessEdge = gTable[gName].toEdgeTessKey(edge);
      const tessFaces = tSquare.getFacesOnEdge(tessEdge);
      const expFaces = tessFaces.map(el => gTable[gName].fromFaceTessKey(el));
      return expect(
        gTable[gName].getFacesOnEdge(edge),
        gName + " " + edge
      ).to.deep.equal(expFaces);
    };

    it("should be based on the tesselation method", () => {
      verify(2, "e,0,0,0,0");
      verify("U", "e,1,2,3,0");
    });
  });

  describe("getVerticesOnEdge", () => {
    const verify = function(gName, edge) {
      const tessEdge = gTable[gName].toEdgeTessKey(edge);
      const tessVertices = tSquare.getVerticesOnEdge(tessEdge);
      const expVertices = tessVertices.map(el =>
        gTable[gName].fromVertexTessKey(el)
      );
      return expect(
        gTable[gName].getVerticesOnEdge(edge),
        gName + " " + edge
      ).to.deep.equal(expVertices);
    };

    it("should be based on the tesselation method", () => {
      verify(2, "e,0,0,0,0");
      verify("U", "e,1,2,3,0");
    });
  });

  describe("getFacesOnVertex", () => {
    const verify = function(gName, vertex) {
      const tessVertex = gTable[gName].toVertexTessKey(vertex);
      const tessFaces = tSquare.getFacesOnVertex(tessVertex);
      const expFaces = tessFaces.map(el => gTable[gName].fromFaceTessKey(el));
      return expect(
        gTable[gName].getFacesOnVertex(vertex),
        gName + " " + vertex
      ).to.deep.equal(expFaces);
    };

    it("should be based on the tesselation method", () => {
      verify(2, "v,0,0,0");
      verify("U", "v,2,3,0");
    });
  });

  describe("getEdgesOnVertex", () => {
    const verify = function(gName, vertex) {
      const tessVertex = gTable[gName].toVertexTessKey(vertex);
      const tessEdges = tSquare.getEdgesOnVertex(tessVertex);
      const expEdges = tessEdges.map(el => gTable[gName].fromEdgeTessKey(el));
      return expect(
        gTable[gName].getEdgesOnVertex(vertex),
        gName + " " + vertex
      ).to.deep.equal(expEdges);
    };

    it("should be based on the tesselation method", () => {
      verify(2, "v,0,0,0");
      verify("U", "v,2,3,0");
    });
  });

  describe("getAdjacentFaces", () => {
    const verify = function(gName, face) {
      const tessFace = gTable[gName].toFaceTessKey(face);
      const tessExpFaces = tSquare.getAdjacentFaces(tessFace);
      const expFaces = tessExpFaces.map(el => gTable[gName].fromFaceTessKey(el));
      return expect(
        gTable[gName].getAdjacentFaces(face),
        gName + " " + face
      ).to.deep.equal(expFaces);
    };

    it("should be based on the tesselation method", () => {
      verify(2, "f,0,0,0");
      verify("U", "f,1,2,0");
    });
  });

  describe("getTouchingFaces", () => {
    const verify = function(gName, face) {
      const tessFace = gTable[gName].toFaceTessKey(face);
      const tessExpFaces = tSquare.getTouchingFaces(tessFace);
      const expFaces = tessExpFaces.map(el => gTable[gName].fromFaceTessKey(el));
      return expect(
        gTable[gName].getTouchingFaces(face),
        gName + " " + face
      ).to.deep.equal(expFaces);
    };

    it("should be based on the tesselation method", () => {
      verify(2, "f,0,0,0");
      verify("U", "f,1,2,0");
    });
  });

  describe("getSurroundingEdges", () => {
    const verify = function(gName, edge) {
      const tessEdge = gTable[gName].toEdgeTessKey(edge);
      const tessExpEdges = tSquare.getSurroundingEdges(tessEdge);
      const expEdges = tessExpEdges.map(el => gTable[gName].fromEdgeTessKey(el));
      return expect(
        gTable[gName].getSurroundingEdges(edge),
        gName + " " + edge
      ).to.deep.equal(expEdges);
    };

    it("should be based on the tesselation method", () => {
      verify(2, "e,0,0,0,0");
      verify("U", "e,1,2,3,0");
    });
  });

  describe("getTouchingEdges", () => {
    const verify = function(gName, edge) {
      const tessEdge = gTable[gName].toEdgeTessKey(edge);
      const tessExpEdges = tSquare.getTouchingEdges(tessEdge);
      const expEdges = tessExpEdges.map(el => gTable[gName].fromEdgeTessKey(el));
      return expect(
        gTable[gName].getTouchingEdges(edge),
        gName + " " + edge
      ).to.deep.equal(expEdges);
    };

    it("should be based on the tesselation method", () => {
      verify(2, "e,0,0,0,0");
      verify("U", "e,1,2,3,0");
    });
  });

  describe("getSurroundingVertices", () => {
    const verify = function(gName, vertex) {
      const tessVertex = gTable[gName].toVertexTessKey(vertex);
      const tessExpVertices = tSquare.getSurroundingVertices(tessVertex);
      const expVertices = tessExpVertices.map(el =>
        gTable[gName].fromVertexTessKey(el)
      );
      return expect(
        gTable[gName].getSurroundingVertices(vertex),
        gName + " " + vertex
      ).to.deep.equal(expVertices);
    };

    it("should be based on the tesselation method", () => {
      verify(2, "v,0,0,0");
      verify("U", "v,2,3,0");
    });
  });

  describe("getAdjacentVertices", () => {
    const verify = function(gName, vertex) {
      const tessVertex = gTable[gName].toVertexTessKey(vertex);
      const tessExpVertices = tSquare.getAdjacentVertices(tessVertex);
      const expVertices = tessExpVertices.map(el =>
        gTable[gName].fromVertexTessKey(el)
      );
      return expect(
        gTable[gName].getAdjacentVertices(vertex),
        gName + " " + vertex
      ).to.deep.equal(expVertices);
    };

    it("should be based on the tesselation method", () => {
      verify(2, "v,0,0,0");
      verify("U", "v,2,3,0");
    });
  });

  describe("getOtherFace", () => {
    const verify = function(gName, face, edge) {
      const tessFace = gTable[gName].toFaceTessKey(face);
      const tessEdge = gTable[gName].toEdgeTessKey(edge);
      const tessExpFace = tSquare.getOtherFace(tessFace, tessEdge);
      const expFace = tessExpFace && gTable[gName].fromFaceTessKey(tessExpFace);
      return expect(
        gTable[gName].getOtherFace(face, edge),
        gName + " " + face + " " + edge
      ).to.deep.equal(expFace);
    };

    it("should be based on the tesselation method", () => {
      verify(2, "f,0,0,0", "e,1,0,3,0");
      verify(2, "f,0,0,0", "e,0,1,3,0"); // null
      verify("U", "f,1,2,0", "e,1,2,0,0");
    });
  });

  describe("getOtherVertex", () => {
    const verify = function(gName, vertex, edge) {
      const tessVertex = gTable[gName].toVertexTessKey(vertex);
      const tessEdge = gTable[gName].toEdgeTessKey(edge);
      const tessExpVertex = tSquare.getOtherVertex(tessVertex, tessEdge);
      const expVertex =
        tessExpVertex && gTable[gName].fromVertexTessKey(tessExpVertex);
      return expect(
        gTable[gName].getOtherVertex(vertex, edge),
        gName + " " + vertex + " " + edge
      ).to.deep.equal(expVertex);
    };

    it("should be based on the tesselation method", () => {
      verify(2, "v,0,0,0", "e,0,0,3,0");
      verify(2, "v,0,0,0", "e,1,0,3,0"); // null
      verify("U", "v,2,3,0", "e,1,3,0,0");
    });
  });

  describe("isEdgeInside", () => {
    const expectE = function(gName, edge) {
      return expect(gTable[gName].isEdgeInside(edge), gName + " " + edge);
    };

    it("should return true if the grid has both of the edge's faces", () => {
      expectE(2, "e,1,0,3,0").to.equal(true);
      expectE(2, "e,0,1,3,0").to.equal(false);
      expectE(2, "e,3,0,3,0").to.equal(false);

      expectE(2, "e,1,1,0,0").to.equal(true);
      expectE("U", "e,1,1,0,0").to.equal(false);
      expectE(2, "e,1,2,0,0").to.equal(false);
      expectE("U", "e,1,2,0,0").to.equal(false);
    });
  });

  describe("isEdgeOnBorder", () => {
    const expectE = function(gName, edge) {
      return expect(gTable[gName].isEdgeOnBorder(edge), gName + " " + edge);
    };

    it("should return true if the grid has one of the edge's faces", () => {
      expectE(2, "e,1,0,3,0").to.equal(false);
      expectE(2, "e,0,1,3,0").to.equal(true);
      expectE(2, "e,3,0,3,0").to.equal(false);

      expectE(2, "e,1,1,0,0").to.equal(false);
      expectE("U", "e,1,1,0,0").to.equal(true);
      expectE(2, "e,1,2,0,0").to.equal(true);
      expectE("U", "e,1,2,0,0").to.equal(false);
    });
  });

  describe("isEdgeOutside", () => {
    const expectE = function(gName, edge) {
      return expect(gTable[gName].isEdgeOutside(edge), gName + " " + edge);
    };

    it("should return true if the grid has neither of the edge's faces", () => {
      expectE(2, "e,1,0,3,0").to.equal(false);
      expectE(2, "e,0,1,3,0").to.equal(false);
      expectE(2, "e,3,0,3,0").to.equal(true);

      expectE(2, "e,1,1,0,0").to.equal(false);
      expectE("U", "e,1,1,0,0").to.equal(false);
      expectE(2, "e,1,2,0,0").to.equal(false);
      expectE("U", "e,1,2,0,0").to.equal(true);
    });
  });

  describe("getFaceCoordinates", () => {
    it("should apply origin and scale to the tesselation coordinates", () => {
      expect(gTwo.getFaceCoordinates("f,0,0,0")).to.deep.equal([
        [30, 10],
        [50, 10],
        [50, 30],
        [30, 30],
      ]);
      expect(gUPentomino.getFaceCoordinates("f,4,2,0")).to.deep.equal([
        [110, 50],
        [130, 50],
        [130, 70],
        [110, 70],
      ]);
    });

    it("should default to tesselation coordinates if no origin and scale are provided", () => {
      expect(gTwoUnshifted.getFaceCoordinates("f,0,0,0")).to.deep.equal([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ]);
    });
  });

  describe("getEdgeCoordinates", () => {
    it("should apply origin and scale to the tesselation coordinates", () => {
      expect(gTwo.getEdgeCoordinates("e,0,0,0,0")).to.deep.equal([
        [30, 10],
        [50, 10],
      ]);
      expect(gTwo.getEdgeCoordinates("e,4,2,3,0")).to.deep.equal([
        [110, 70],
        [110, 50],
      ]);
    });

    it("should default to tesselation coordinates if no origin and scale are provided", () => {
      expect(gTwoUnshifted.getEdgeCoordinates("e,0,0,0,0")).to.deep.equal([
        [0, 0],
        [1, 0],
      ]);
    });
  });

  describe("getVertexCoordinates", () => {
    it("should apply origin and scale to the tesselation coordinates", () => {
      expect(gTwo.getVertexCoordinates("v,0,0,0")).to.deep.equal([30, 10]);
      expect(gUPentomino.getVertexCoordinates("v,4,2,0")).to.deep.equal([
        110,
        50,
      ]);
    });

    it("should default to tesselation coordinates if no origin and scale are provided", () => {
      expect(gTwoUnshifted.getVertexCoordinates("v,0,2,0")).to.deep.equal([0, 2]);
    });
  });

  describe("getBoundingBox", () => {
    it("should return a rectangle containing all vertices", () => {
      expect(gTwo.getBoundingBox(), "2").to.deep.equal([30, 10, 40, 40]);
      expect(gThree.getBoundingBox(), "3").to.deep.equal([30, 10, 60, 60]);
      expect(gUPentomino.getBoundingBox(), "U").to.deep.equal([30, 10, 60, 40]);
    });
  });

  const genGeomName = gen.oneOf(["2", "3", "U"]);
  doFindElTests(genGeomName, name => gTable[name]);
});
