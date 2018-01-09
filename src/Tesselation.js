// @flow

import type {Point, Rect, Matrix2} from "./math.js";
import type {FID, VID, FKey, EKey, VKey, XKey} from "./Tesselation.types.js";

import {forEachObj, mapValues, orderArrays, union} from "./utils.js";
import {getBaseRectSize, reducePoint} from "./PlanePeriod.js";
import findFaceCover from "./findFaceCover.js";
import PolygonAtlas from "./PolygonAtlas.js";
import makeVoronoiAtlas from "./makeVoronoiAtlas.js";

type TesselationProps = {
  faceVerticesTable: {[FID]: Array<VKey>},
  vertexCoordinatesTable: {[VID]: Point},
  periodMatrix: Matrix2,
};

type EdgeTable = {[FID]: Array<EKey>};

type IncidenceCache = {
  eOnF: {[FID]: Array<EKey>},
  vOnF: {[FID]: Array<VKey>},
  fOnE: {[FID]: Array<Array<FKey>>},
  vOnE: {[FID]: Array<[VKey, VKey]>},
  fOnV: {[VID]: Array<FKey>},
  eOnV: {[VID]: Array<EKey>},
};

function shiftEl<T: XKey>(el: T, toEl: XKey): T {
  const newEl: T = (el.slice(0): any);
  newEl[0] += toEl[0];
  newEl[1] += toEl[1];
  return newEl;
}

function shiftEls<T: XKey>(elArray: Array<T>, toEl: XKey): Array<T> {
  return elArray.map(el => shiftEl(el, toEl));
}

// Edges on two faces can be identified in two ways. This makes a table that
// disambiguates them and chooses one to use.
function makeEdgeTable(vOnETable: {[FID]: Array<[VKey, VKey]>}): EdgeTable {
  const vertexPairTable = {};
  const edgeTable = {};

  const pairToKeyAndEdge = ([v1, v2], i, fid) => {
    const [vl, vh] = orderArrays(v1, v2);
    return {
      vpKey: [vl[2], vh[0] - vl[0], vh[1] - vl[1], vh[2]].join(","),
      edge: [-vl[0], -vl[1], i, fid],
    };
  };
  forEachObj(vOnETable, (vOnERow, fid) => {
    edgeTable[fid] = edgeTable[fid] || [];
    vOnERow.forEach((vs, i) => {
      const {vpKey, edge} = pairToKeyAndEdge(vs, i, fid);
      vertexPairTable[vpKey] = vertexPairTable[vpKey] || [];
      vertexPairTable[vpKey].push(edge);
    });
  });

  forEachObj(vertexPairTable, (edges, vpKey) => {
    if (edges.length === 1) {
      const [, , i1, fid1] = edges[0];
      edgeTable[fid1][i1] = [0, 0, i1, fid1];
    } else {
      const [el, eh] = orderArrays(edges[0], edges[1]);
      const [x1, y1, i1, fid1] = el;
      const [x2, y2, i2, fid2] = eh;
      edgeTable[fid1][i1] = [x2 - x1, y2 - y1, i2, fid2];
      edgeTable[fid2][i2] = [0, 0, i2, fid2];
    }
  });
  return edgeTable;
}

function getMappedEdge(edge: EKey, edgeTable: EdgeTable): EKey {
  const mappedEdge = edgeTable[edge[3]][edge[2]];
  return [
    edge[0] + mappedEdge[0],
    edge[1] + mappedEdge[1],
    mappedEdge[2],
    mappedEdge[3],
  ];
}

// Given an array of edges without collapsing duplicates and the return of
// makeEdgeTable, return array with remapping and duplicates collapsed.
function remapEdges(edgeArray: Array<EKey>, edgeTable: EdgeTable): Array<EKey> {
  const seenEdges = {};
  const newArray = [];
  edgeArray.forEach(edge => {
    const newEdge = getMappedEdge(edge, edgeTable);
    const newEdgeKey = newEdge.join(",");
    if (!seenEdges[newEdgeKey]) {
      seenEdges[newEdgeKey] = true;
      newArray.push(newEdge);
    }
  });
  return newArray;
}

function isFaceEqual(f1: FKey, f2: FKey): boolean {
  return f1[0] === f2[0] && f1[1] === f2[1] && f1[2] === f2[2];
}
function isEdgeEqual(e1: EKey, e2: EKey): boolean {
  return (
    e1[0] === e2[0] && e1[1] === e2[1] && e1[2] === e2[2] && e1[3] === e2[3]
  );
}
function isVertexEqual(v1: VKey, v2: VKey): boolean {
  return v1[0] === v2[0] && v1[1] === v2[1] && v1[2] === v2[2];
}

// Go around a vertex to compute all faces and edges on it. The returns will be
// in consecutive order if the tesselation is complete, otherwise a bit
// arbitrary.
function computeElementsAroundVertex(
  vertex: VID,
  preFaces: Array<FKey>,
  eOnF: {[FID]: Array<EKey>},
  vOnF: {[FID]: Array<VKey>},
  fOnE: {[FID]: Array<Array<FKey>>}
): {faces: Array<FKey>, edges: Array<EKey>} {
  const ret = {faces: [], edges: []};
  const usedFaces = {};
  const usedEdges = {};

  const getOtherFace = (face: FKey, edge: EKey): ?FKey => {
    const [f1, f2] = shiftEls(fOnE[edge[3]][edge[2]], edge);
    if (!f2) {
      return null;
    }
    return isFaceEqual(f1, face) ? f2 : f1;
  };
  // Optionally pass null for edge to get an edge on the face+vertex.
  const getOtherEdge = (face: FKey, edge: ?EKey): ?EKey => {
    const vertices = shiftEls(vOnF[face[2]], face);
    const index = vertices.findIndex(v => isVertexEqual(v, [0, 0, vertex]));
    if (index === -1) {
      return null;
    }
    const edges = shiftEls(eOnF[face[2]], face);
    const e1 = edges[index];
    if (!edge || !isEdgeEqual(e1, edge)) {
      return e1;
    }
    return index === 0 ? edges[edges.length - 1] : edges[index - 1];
  };
  const tryToAddFace = (face: FKey, prevEdge: EKey) => {
    const usedFKey = face.join(",");
    if (!usedFaces[usedFKey]) {
      usedFaces[usedFKey] = true;
      ret.faces.push(face);
      const nextEdge = getOtherEdge(face, prevEdge);
      nextEdge && tryToAddEdge(face, nextEdge);
    }
  };
  const tryToAddEdge = (prevFace: FKey, edge: EKey) => {
    const usedEKey = edge.join(",");
    if (!usedEdges[usedEKey]) {
      usedEdges[usedEKey] = true;
      ret.edges.push(edge);
      const nextFace = getOtherFace(prevFace, edge);
      nextFace && tryToAddFace(nextFace, edge);
    }
  };

  preFaces.forEach(face => {
    const firstEdge = getOtherEdge(face, null);
    if (!firstEdge) {
      return;
    }
    tryToAddFace(face, firstEdge);
    tryToAddEdge(face, firstEdge);
  });

  return ret;
}

function reducePointWithShift(
  [px, py]: Point,
  [dx, dy]: Point,
  periodMatrix: Matrix2
): [Point, Point] {
  const [periodCoords, [rx, ry]] = reducePoint([px - dx, py - dy], periodMatrix);
  return [periodCoords, [rx + dx, ry + dy]];
}

export default class Tesselation {
  faceIDs: Array<FID>;
  faceVerticesTable: {[FID]: Array<VKey>};
  vertexCoordinatesTable: {[VID]: Point};
  periodMatrix: Matrix2;
  _edgeTable: EdgeTable;
  _incidenceCache: IncidenceCache;
  _baseRect: Rect;
  _faceCover: Array<FKey>;
  _faceAtlas: PolygonAtlas<FKey>;
  _edgeAtlas: PolygonAtlas<EKey>;
  _vertexAtlas: PolygonAtlas<VKey>;

  constructor(props: TesselationProps) {
    if (!props) {
      throw new Error("new Tesselation: first parameter must be an object");
    } else if (
      !Array.isArray(props.periodMatrix) ||
      props.periodMatrix.length !== 4 ||
      props.periodMatrix.some(n => n !== Number(n))
    ) {
      throw new Error(
        "new Tesselation: must pass array of 4 numbers for periodMatrix"
      );
    } else if (!props.faceVerticesTable) {
      throw new Error(
        "new Tesselation: must pass an object for faceVerticesTable"
      );
    } else if (!props.vertexCoordinatesTable) {
      throw new Error(
        "new Tesselation: must pass an object for vertexCoordinatesTable"
      );
    }
    forEachObj(props.faceVerticesTable, (vArray, fid) => {
      if (!Array.isArray(vArray)) {
        throw new Error(
          "new Tesselation: all values of faceVerticesTable must be arrays; check face " +
            fid
        );
      }
      vArray.forEach((v, i) => {
        if (
          !Array.isArray(v) ||
          v.length !== 3 ||
          Number(v[0]) !== v[0] ||
          Number(v[1]) !== v[1]
        ) {
          throw new Error(
            "new Tesselation: in faceVerticesTable, " +
              "all vertices must be [number, number, vertexID]; " +
              "check face " +
              fid +
              " #" +
              (i + 1)
          );
        } else if (!props.vertexCoordinatesTable.hasOwnProperty(v[2])) {
          throw new Error(
            "new Tesselation: in faceVerticesTable, " +
              "vertexID (third element) of each vertex must be in vertexCoordinatesTable; " +
              "check face " +
              fid +
              " #" +
              (i + 1)
          );
        }
      });
    });
    forEachObj(props.vertexCoordinatesTable, (p, vid) => {
      if (
        !Array.isArray(p) ||
        p.length !== 2 ||
        Number(p[0]) !== p[0] ||
        Number(p[1]) !== p[1]
      ) {
        throw new Error(
          "new Tesselation: all values of vertexCoordinatesTable must be [number, number]; check vertex " +
            vid
        );
      }
    });

    this.faceIDs = Object.keys(props.faceVerticesTable);
    this.faceVerticesTable = props.faceVerticesTable;
    this.vertexCoordinatesTable = props.vertexCoordinatesTable;
    this.periodMatrix = props.periodMatrix;
  }

  getProps(): TesselationProps {
    return {
      faceVerticesTable: this.faceVerticesTable,
      vertexCoordinatesTable: this.vertexCoordinatesTable,
      periodMatrix: this.periodMatrix,
    };
  }

  _getIncidenceCache(): IncidenceCache {
    if (this._incidenceCache) {
      return this._incidenceCache;
    }
    const cache: IncidenceCache = {
      eOnF: {},
      vOnF: {},
      fOnE: {},
      vOnE: {},
      fOnV: {},
      eOnV: {},
    };
    // This would be the real fOnV except for ordering.
    const prelimFOnV: {[VID]: Array<FKey>} = {};

    // First, do simple iteration over faces and their vertices.
    this.faceIDs.forEach(fid => {
      const vs = this.faceVerticesTable[fid];

      // vOnF is finished with this.
      cache.vOnF[fid] = vs;
      // eOnF is finished up to using canonical edge names.
      cache.eOnF[fid] = vs.map((vk, i) => [0, 0, i, fid]);

      cache.fOnE[fid] = [];
      cache.vOnE[fid] = [];
      vs.forEach((v, i) => {
        prelimFOnV[v[2]] = prelimFOnV[v[2]] || [];
        prelimFOnV[v[2]].push([-v[0], -v[1], fid]);
        const nextI = (i + 1) % vs.length;
        // fOnE is not yet using canonical edges; these will be collapsed later.
        cache.fOnE[fid][i] = [[0, 0, fid]];
        // vOnE is finished with this.
        cache.vOnE[fid][i] = [v, vs[nextI]];
      });
    });

    // Use vOnE to determine what the canonical edges are.
    const edgeTable = makeEdgeTable(cache.vOnE);
    // eOnF is finished with this.
    cache.eOnF = mapValues(cache.eOnF, edges => remapEdges(edges, edgeTable));

    // Finish fOnE next. This requires identifying which edges are the same and
    // combining their two edge arrays with the appropriate shifting.
    this.faceIDs.forEach(fid => {
      edgeTable[fid].forEach((edge, i) => {
        const [ex, ey, ei, efid] = edge;
        if (efid !== fid || ei !== i) {
          const invEdge = [-ex, -ey, ei, efid];
          const oldFOnE1 = cache.fOnE[fid][i];
          const oldFOnE2 = cache.fOnE[efid][ei];
          cache.fOnE[fid][i] = [...oldFOnE1, ...shiftEls(oldFOnE2, edge)];
          cache.fOnE[efid][ei] = [...shiftEls(oldFOnE1, invEdge), ...oldFOnE2];
        }
      });
    });

    // fOnV and eOnV would be easy but for ordering. Use a helper to finish
    // those two.
    forEachObj(prelimFOnV, (preFaces, vid) => {
      const {faces, edges} = computeElementsAroundVertex(
        vid,
        preFaces,
        cache.eOnF,
        cache.vOnF,
        cache.fOnE
      );
      cache.fOnV[vid] = faces;
      cache.eOnV[vid] = edges;
    });

    this._edgeTable = edgeTable;
    this._incidenceCache = cache;
    return cache;
  }

  getCanonicalEdge(edge: EKey) {
    // this._edgeTable needs to be populated first.
    this._getIncidenceCache();
    return getMappedEdge(edge, this._edgeTable);
  }

  isSameEdge(e1: EKey, e2: EKey): boolean {
    return isEdgeEqual(this.getCanonicalEdge(e1), this.getCanonicalEdge(e2));
  }

  getEdgesOnFace(face: FKey): Array<EKey> {
    const base = this._getIncidenceCache().eOnF[face[2]];
    if (!base) {
      throw new Error("Invalid face " + String(face));
    }
    return shiftEls(base, face);
  }

  getVerticesOnFace(face: FKey): Array<VKey> {
    const base = this._getIncidenceCache().vOnF[face[2]];
    if (!base) {
      throw new Error("Invalid face " + String(face));
    }
    return shiftEls(base, face);
  }

  getFacesOnEdge(edge: EKey): Array<FKey> {
    let base = this._getIncidenceCache().fOnE[edge[3]];
    base = base && base[edge[2]];
    if (!base) {
      throw new Error("Invalid edge " + String(edge));
    }
    return shiftEls(base, edge);
  }

  getVerticesOnEdge(edge: EKey): [VKey, VKey] {
    let base = this._getIncidenceCache().vOnE[edge[3]];
    base = base && base[edge[2]];
    if (!base) {
      throw new Error("Invalid edge " + String(edge));
    }
    return [shiftEl(base[0], edge), shiftEl(base[1], edge)];
  }

  getFacesOnVertex(vertex: VKey): Array<FKey> {
    const base = this._getIncidenceCache().fOnV[vertex[2]];
    if (!base) {
      throw new Error("Invalid vertex " + String(vertex));
    }
    return shiftEls(base, vertex);
  }

  getEdgesOnVertex(vertex: VKey): Array<EKey> {
    const base = this._getIncidenceCache().eOnV[vertex[2]];
    if (!base) {
      throw new Error("Invalid vertex " + String(vertex));
    }
    return shiftEls(base, vertex);
  }

  getOtherFace(face: FKey, edge: EKey): ?FKey {
    const [f1, f2] = this.getFacesOnEdge(edge);
    const is1Equal = f1 && isFaceEqual(f1, face);
    const is2Equal = f2 && isFaceEqual(f2, face);
    if (!is1Equal && !is2Equal) {
      return null;
    }
    return (is1Equal ? f2 : f1) || null;
  }

  getOtherVertex(vertex: VKey, edge: EKey): ?VKey {
    const [v1, v2] = this.getVerticesOnEdge(edge);
    const is1Equal = v1 && isVertexEqual(v1, vertex);
    const is2Equal = v2 && isVertexEqual(v2, vertex);
    if (!is1Equal && !is2Equal) {
      return null;
    }
    return (is1Equal ? v2 : v1) || null;
  }

  getAdjacentFaces(face: FKey): Array<FKey> {
    return this.getEdgesOnFace(face)
      .map(edge => this.getOtherFace(face, edge))
      .filter(Boolean);
  }

  getAdjacentVertices(vertex: VKey): Array<VKey> {
    return this.getEdgesOnVertex(vertex)
      .map(edge => this.getOtherVertex(vertex, edge))
      .filter(Boolean);
  }

  getTouchingFaces(face: FKey): Array<FKey> {
    return union(
      this.getVerticesOnFace(face).map(v => this.getFacesOnVertex(v)),
      [face]
    );
  }

  getTouchingEdges(edge: EKey): Array<EKey> {
    return union(
      this.getVerticesOnEdge(edge).map(v => this.getEdgesOnVertex(v)),
      [this.getCanonicalEdge(edge)]
    );
  }

  getSurroundingEdges(edge: EKey): Array<EKey> {
    return union(this.getFacesOnEdge(edge).map(f => this.getEdgesOnFace(f)), [
      this.getCanonicalEdge(edge),
    ]);
  }

  getSurroundingVertices(vertex: VKey): Array<VKey> {
    return union(
      this.getFacesOnVertex(vertex).map(f => this.getVerticesOnFace(f)),
      [vertex]
    );
  }

  getFaceCoordinates(face: FKey): Array<Point> {
    return this.getVerticesOnFace(face).map(v => this.getVertexCoordinates(v));
  }

  getEdgeCoordinates(edge: EKey): [Point, Point] {
    const [v1, v2] = this.getVerticesOnEdge(edge);
    return [this.getVertexCoordinates(v1), this.getVertexCoordinates(v2)];
  }

  getVertexCoordinates(vertex: VKey): Point {
    const [vx, vy, vid] = vertex;
    const [vidX, vidY] = this.vertexCoordinatesTable[vid];
    const [a, b, c, d] = this.periodMatrix;
    return [vx * a + vy * c + vidX, vx * b + vy * d + vidY];
  }

  // Below are the methods that figure out which element is closest to a given
  // point in the plane. The general strategy here is to choose a base
  // rectangle and move the provided point inside it using the period matrix.
  // This makes the problem finite, and we can precompute all elements that
  // intersect the base rectangle, figure out where the point is using them,
  // and then shift back to the real point/element using the period.

  // This helper function does the aforementioned precomputing for faces. It
  // returns a base rectangle and a list of faces that intersect it. This can
  // be used to build a map of which parts of the base rectangle correspond to
  // which element for each of faces, edges, and vertices.
  _computeFaceCover(): [Rect, Array<FKey>] {
    if (this._baseRect) {
      return [this._baseRect, this._faceCover];
    }

    const periodMatrix = this.periodMatrix;
    const baseRectSize = getBaseRectSize(periodMatrix);
    // findFaceCover requires that a face in the 0,0 period intersects the base
    // rectangle, so we position the base rectangle to be centered at the first
    // vertex of the first face in 0,0.
    const firstFID = this.faceIDs[0];
    const firstFace = [0, 0, firstFID];
    const firstVertex = this.getVerticesOnFace(firstFace)[0];
    const firstVCoords = this.getVertexCoordinates(firstVertex);
    const baseRect = [
      firstVCoords[0] - baseRectSize[0] / 2,
      firstVCoords[1] - baseRectSize[1] / 2,
      baseRectSize[0],
      baseRectSize[1],
    ];

    const faceCover = findFaceCover(
      baseRect,
      periodMatrix,
      this.faceIDs,
      fid => this.getFaceCoordinates([0, 0, fid]),
      fid => this.getTouchingFaces([0, 0, fid])
    );

    this._baseRect = baseRect;
    this._faceCover = faceCover;
    return [baseRect, faceCover];
  }

  // Returns a PolygonAtlas that can determine which face contains a point for
  // any point in the base rectangle of _computeFaceCover.
  _computeFaceAtlas(): PolygonAtlas<FKey> {
    if (this._faceAtlas) {
      return this._faceAtlas;
    }

    const [baseRect, faceCover] = this._computeFaceCover();
    const faceAtlas = new PolygonAtlas(baseRect);
    faceCover.forEach(fKey => {
      faceAtlas.addPolygon(this.getFaceCoordinates(fKey), fKey);
    });
    this._faceAtlas = faceAtlas;
    return faceAtlas;
  }

  // Returns a PolygonAtlas that can determine the closest edge to a point for
  // any point in the base rectangle of _computeFaceCover. The edge's midpoint
  // is used for computing distance.
  _computeEdgeAtlas(): PolygonAtlas<EKey> {
    if (this._edgeAtlas) {
      return this._edgeAtlas;
    }

    const [, faceCover] = this._computeFaceCover();
    const edges = union(faceCover.map(k => this.getEdgesOnFace(k)));
    const edgesWithMidpoints = edges.map(k => {
      const [[x1, y1], [x2, y2]] = this.getEdgeCoordinates(k);
      return [[(x1 + x2) / 2, (y1 + y2) / 2], k];
    });
    const edgeAtlas = makeVoronoiAtlas(edgesWithMidpoints);
    this._edgeAtlas = edgeAtlas;
    return edgeAtlas;
  }

  // Returns a PolygonAtlas that can determine the closest vertex to a point
  // for any point in the base rectangle of _computeFaceCover.
  _computeVertexAtlas(): PolygonAtlas<VKey> {
    if (this._vertexAtlas) {
      return this._vertexAtlas;
    }

    const [, faceCover] = this._computeFaceCover();
    const vertices = union(faceCover.map(k => this.getVerticesOnFace(k)));
    const verticesWithPoints = vertices.map(k => {
      return [this.getVertexCoordinates(k), k];
    });
    const vertexAtlas = makeVoronoiAtlas(verticesWithPoints);
    this._vertexAtlas = vertexAtlas;
    return vertexAtlas;
  }

  // Tiny helper to handle changing an arbitrary point into one inside the base
  // rectangle, then using that to query an atlas using that rectangle.
  _getCandidatesFromAtlas<T: XKey>(
    point: Point,
    atlas: PolygonAtlas<T>
  ): Array<T> {
    const firstFID = this.faceIDs[0];
    const baseRect = this._computeFaceCover()[0];

    const [[px, py], reducedPoint] = reducePointWithShift(
      point,
      [baseRect[0], baseRect[1]],
      this.periodMatrix
    );

    let candEls: Array<T> = atlas.findPolygons(reducedPoint).map(r => r[1]);
    candEls = shiftEls(candEls, ([px, py, firstFID]: FKey));
    return candEls;
  }

  findFaceAt(point: Point): ?FKey {
    const faceAtlas = this._computeFaceAtlas();
    const cands = this._getCandidatesFromAtlas(point, faceAtlas);
    return cands[0] || null;
  }

  findEdgeAt(point: Point): ?EKey {
    const edgeAtlas = this._computeEdgeAtlas();
    const cands = this._getCandidatesFromAtlas(point, edgeAtlas);
    return cands[0] || null;
  }

  findVertexAt(point: Point): ?VKey {
    const vertexAtlas = this._computeVertexAtlas();
    const cands = this._getCandidatesFromAtlas(point, vertexAtlas);
    return cands[0] || null;
  }
}
