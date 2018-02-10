// @flow

// Not an actual test file. Contains a reusable function for testing methods
// like findFaceAt on an interface with neighbor and coordinate functions.

import {describe, it} from "mocha";
import {expect} from "chai";
import {check, gen} from "mocha-testcheck";

import type {Point} from "../src/math.js";
import {isPointInPolygon} from "../src/math.js";

// The interface that can be tested by this file. The findXAt methods are the
// only ones tested; the others are required helpers.
type ElFinder<F, E, V> = {
  getSurroundingEdges: E => Array<E>,
  getSurroundingVertices: V => Array<V>,
  getFaceCoordinates: F => Array<Point>,
  getEdgeCoordinates: E => Array<Point>,
  getVertexCoordinates: V => Point,
  findFaceAt: Point => ?F,
  findEdgeAt: Point => ?E,
  findVertexAt: Point => ?V,
};

// The rounding in these tests is intentional. The functions do actually break
// when numbers around 1e-17 are passed in, since they are not well-equipped
// for rounding errors. This is a very hard thing to fix without a lot of
// complexity, and it's unlikely to affect actual usage.
const roundSanely = x => Math.round(x * 10000000) / 10000000;
const genCoord = gen.numberWithin(-10000, 10000).then(roundSanely);
const genPoint = gen.array([genCoord, genCoord]);

export default function doFindElTests<F, E, V>(
  // Not really worth it to get the testcheck gen types in here, so using any.
  genElFinderName: any,
  getElFinder: string => ElFinder<F, E, V>
) {
  describe("findFaceAt", () => {
    it(
      "should always return a valid face for a complete tesselation",
      check(
        {times: 1000},
        genElFinderName,
        genPoint,
        (name: string, p: Point) => {
          const elFinder = getElFinder(name);
          const face = elFinder.findFaceAt(p);
          expect(face, "exists").to.be.ok;
          // if check because flow doesn't know we'd have thrown
          if (!face) {
            return;
          }
          const polygon = elFinder.getFaceCoordinates(face);
          expect(isPointInPolygon(p, polygon), "in face").to.equal(true);
        }
      )
    );
  });

  describe("findEdgeAt", () => {
    // Returns squared distance
    const getEdgeDist = (elFinder, eKey, point) => {
      const [[x1, y1], [x2, y2]] = elFinder.getEdgeCoordinates(eKey);
      const [xm, ym] = [(x1 + x2) / 2, (y1 + y2) / 2];
      return Math.pow(xm - point[0], 2) + Math.pow(ym - point[1], 2);
    };

    // The enlarging done in makeVoronoiAtlas means the choice of element is
    // arbitrary when it's nearly tied. Require distances to be apart by this
    // much before we flag a test as a failure.
    const DISTANCE_TOLERANCE = 0.000001;

    it(
      "should always return the closest edge for a complete tesselation",
      check(
        {times: 1000},
        genElFinderName,
        genPoint,
        (name: string, p: Point) => {
          const elFinder = getElFinder(name);
          const bestEdge = elFinder.findEdgeAt(p);
          expect(bestEdge, "exists").to.be.ok;
          // if check because flow doesn't know we'd have thrown
          if (!bestEdge) {
            return;
          }
          const nearEdges = elFinder.getSurroundingEdges(bestEdge);
          const bestDistance = getEdgeDist(elFinder, bestEdge, p);
          const nearDistances = nearEdges.map(k => getEdgeDist(elFinder, k, p));
          nearDistances.forEach((d, i) => {
            if (d + DISTANCE_TOLERANCE < bestDistance) {
              expect.fail(
                bestEdge,
                nearEdges[i],
                "Edge " +
                  String(nearEdges[i]) +
                  " was closer than " +
                  String(bestEdge) +
                  ` (${d} < ${bestDistance})`
              );
            }
          });
        }
      )
    );
  });

  describe("findVertexAt", () => {
    // Returns squared distance
    const getVertexDist = (elFinder, vKey, point) => {
      const [xv, yv] = elFinder.getVertexCoordinates(vKey);
      return Math.pow(xv - point[0], 2) + Math.pow(yv - point[1], 2);
    };

    // The enlarging done in makeVoronoiAtlas means the choice of element is
    // arbitrary when it's nearly tied. Require distances to be apart by this
    // much before we flag a test as a failure.
    const DISTANCE_TOLERANCE = 0.000001;

    it(
      "should always return the closest vertex for a complete tesselation",
      check(
        {times: 1000},
        genElFinderName,
        genPoint,
        (name: string, p: Point) => {
          const elFinder = getElFinder(name);
          const bestVertex = elFinder.findVertexAt(p);
          expect(bestVertex, "exists").to.be.ok;
          // if check because flow doesn't know we'd have thrown
          if (!bestVertex) {
            return;
          }
          const nearVertices = elFinder.getSurroundingVertices(bestVertex);
          const bestDistance = getVertexDist(elFinder, bestVertex, p);
          const nearDistances = nearVertices.map(k =>
            getVertexDist(elFinder, k, p)
          );
          nearDistances.forEach((d, i) => {
            if (d + DISTANCE_TOLERANCE < bestDistance) {
              expect.fail(
                bestVertex,
                nearVertices[i],
                "Vertex " +
                  String(nearVertices[i]) +
                  " was closer than " +
                  String(bestVertex) +
                  ` (${d} < ${bestDistance})`
              );
            }
          });
        }
      )
    );
  });
}
