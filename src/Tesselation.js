// @flow

import type {Point, Rect, Matrix2} from "./math.js";
import type {FID, VID, FKey, EKey, VKey, XKey} from "./Tesselation.types.js";

import {forEachObj, forEachObjNum, mapValues, orderArrays} from "./utils.js";
import {isPointInPolygon} from "./math.js";
import {getBaseRectSize, reducePoint} from "./PlanePeriod.js";
import findFaceCover from "./findFaceCover.js";
import QuadTree from "./QuadTree.js";

type TesselationProps = {
  faces: Array<FID>,
  periodMatrix: Matrix2,
  getVerticesOnFace: FID => Array<VKey>,
  getVertexCoordinates: VID => Point,
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

function shiftFaces(elArray: Array<FKey>, toEl: XKey): Array<FKey> {
  return elArray.map(el => shiftEl(el, toEl));
}

function shiftEdges(elArray: Array<EKey>, toEl: XKey): Array<EKey> {
  return elArray.map(el => shiftEl(el, toEl));
}

function shiftVertices(elArray: Array<VKey>, toEl: XKey): Array<VKey> {
  return elArray.map(el => shiftEl(el, toEl));
}

// Edges on two faces can be identified in two ways. This makes a table that
// disambiguates them and chooses one to use.
function makeEdgeTable(vOnETable: {[FID]: Array<[VKey, VKey]>}): EdgeTable {
  const vertexPairTable = {};
  const edgeTable = {};

  const pairToKeyAndEdge = ([v1, v2], fid, i) => {
    const [vl, vh] = orderArrays(v1, v2);
    return {
      vpKey: [vl[2], vh[0] - vl[0], vh[1] - vl[1], vh[2]].join(","),
      edge: [-vl[0], -vl[1], fid, i],
    };
  };
  forEachObjNum(vOnETable, (vOnERow, fid) => {
    edgeTable[fid] = edgeTable[fid] || [];
    vOnERow.forEach((vs, i) => {
      const {vpKey, edge} = pairToKeyAndEdge(vs, fid, i);
      vertexPairTable[vpKey] = vertexPairTable[vpKey] || [];
      vertexPairTable[vpKey].push(edge);
    });
  });

  forEachObj(vertexPairTable, (edges, vpKey) => {
    if (edges.length === 1) {
      const [, , fid1, i1] = edges[0];
      edgeTable[fid1][i1] = [0, 0, fid1, i1];
    } else {
      const [el, eh] = orderArrays(edges[0], edges[1]);
      const [x1, y1, fid1, i1] = el;
      const [x2, y2, fid2, i2] = eh;
      edgeTable[fid1][i1] = [x2 - x1, y2 - y1, fid2, i2];
      edgeTable[fid2][i2] = [0, 0, fid2, i2];
    }
  });
  return edgeTable;
}

function getMappedEdge(edge: EKey, edgeTable: EdgeTable): EKey {
  const mappedEdge = edgeTable[edge[2]][edge[3]];
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
    const [f1, f2] = shiftFaces(fOnE[edge[2]][edge[3]], edge);
    if (!f2) {
      return null;
    }
    return isFaceEqual(f1, face) ? f2 : f1;
  };
  // Optionally pass null for edge to get an edge on the face+vertex.
  const getOtherEdge = (face: FKey, edge: ?EKey): ?EKey => {
    const vertices = shiftVertices(vOnF[face[2]], face);
    const index = vertices.findIndex(v => isVertexEqual(v, [0, 0, vertex]));
    if (index === -1) {
      return null;
    }
    const edges = shiftEdges(eOnF[face[2]], face);
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
  point: Point,
  shift: Point,
  periodMatrix: Matrix2
): [Point, Point] {
  const shiftedPoint = [point[0] - shift[0], point[1] - shift[1]];
  // rsPoint means reduced and shifted point
  const [periodCoords, rsPoint] = reducePoint(shiftedPoint, periodMatrix);
  const reducedPoint = [rsPoint[0] + shift[0], rsPoint[1] + shift[1]];
  return [periodCoords, reducedPoint];
}

export default class Tesselation {
  props: TesselationProps;
  _edgeTable: EdgeTable;
  _incidenceCache: IncidenceCache;
  _baseRect: Rect;
  _quadTree: QuadTree<FKey>;

  constructor(props: TesselationProps) {
    if (!props) {
      throw new Error("new Tesselation: first parameter must be an object");
    }
    this.props = props;
  }

  getIncidenceCache(): IncidenceCache {
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
    this.props.faces.forEach(fid => {
      const vs = this.props.getVerticesOnFace(fid);

      // vOnF is finished with this.
      cache.vOnF[fid] = vs;
      // eOnF is finished up to using canonical edge names.
      cache.eOnF[fid] = vs.map((vk, i) => [0, 0, fid, i]);

      cache.fOnE[fid] = [];
      cache.vOnE[fid] = [];
      vs.forEach((v, i) => {
        prelimFOnV[v[2]] = prelimFOnV[v[2]] || [];
        prelimFOnV[v[2]].push([-v[0], -v[1], fid]);
        const nextI = (i + 1) % vs.length;
        // fOnE is not using canonical edges; these will be collapsed later.
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
    this.props.faces.forEach(fid => {
      edgeTable[fid].forEach((edge, i) => {
        const [ex, ey, enumber, ei] = edge;
        if (enumber !== fid || ei !== i) {
          const invEdge = [-ex, -ey, enumber, ei];
          const oldFOnE1 = cache.fOnE[fid][i];
          const oldFOnE2 = cache.fOnE[enumber][ei];
          cache.fOnE[fid][i] = [...oldFOnE1, ...shiftFaces(oldFOnE2, edge)];
          cache.fOnE[enumber][ei] = [
            ...shiftFaces(oldFOnE1, invEdge),
            ...oldFOnE2,
          ];
        }
      });
    });

    // fOnV and eOnV would be easy but for ordering. Use a helper to finish
    // those two.
    forEachObjNum(prelimFOnV, (preFaces, vid) => {
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
    this.getIncidenceCache();
    return getMappedEdge(edge, this._edgeTable);
  }

  isSameEdge(e1: EKey, e2: EKey): boolean {
    return isEdgeEqual(this.getCanonicalEdge(e1), this.getCanonicalEdge(e2));
  }

  getEdgesOnFace(face: FKey): Array<EKey> {
    const base = this.getIncidenceCache().eOnF[face[2]];
    if (!base) {
      throw new Error("Invalid face " + String(face));
    }
    return shiftEdges(base, face);
  }

  getVerticesOnFace(face: FKey): Array<VKey> {
    const base = this.getIncidenceCache().vOnF[face[2]];
    if (!base) {
      throw new Error("Invalid face " + String(face));
    }
    return shiftVertices(base, face);
  }

  getFacesOnEdge(edge: EKey): Array<FKey> {
    let base = this.getIncidenceCache().fOnE[edge[2]];
    base = base && base[edge[3]];
    if (!base) {
      throw new Error("Invalid edge " + String(edge));
    }
    return shiftFaces(base, edge);
  }

  getVerticesOnEdge(edge: EKey): [VKey, VKey] {
    let base = this.getIncidenceCache().vOnE[edge[2]];
    base = base && base[edge[3]];
    if (!base) {
      throw new Error("Invalid edge " + String(edge));
    }
    return [shiftEl(base[0], edge), shiftEl(base[1], edge)];
  }

  getFacesOnVertex(vertex: VKey): Array<FKey> {
    const base = this.getIncidenceCache().fOnV[vertex[2]];
    if (!base) {
      throw new Error("Invalid vertex " + String(vertex));
    }
    return shiftFaces(base, vertex);
  }

  getEdgesOnVertex(vertex: VKey): Array<EKey> {
    const base = this.getIncidenceCache().eOnV[vertex[2]];
    if (!base) {
      throw new Error("Invalid vertex " + String(vertex));
    }
    return shiftEdges(base, vertex);
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

  getFaceCoordinates(face: FKey): Array<Point> {
    return this.getVerticesOnFace(face).map(v => this.getVertexCoordinates(v));
  }

  getEdgeCoordinates(edge: EKey): [Point, Point] {
    const [v1, v2] = this.getVerticesOnEdge(edge);
    return [this.getVertexCoordinates(v1), this.getVertexCoordinates(v2)];
  }

  getVertexCoordinates(vertex: VKey): Point {
    const [vx, vy, vid] = vertex;
    const [vidX, vidY] = this.props.getVertexCoordinates(vid);
    const [a, b, c, d] = this.props.periodMatrix;
    return [vx * a + vy * b + vidX, vx * c + vy * d + vidY];
  }

  // Below are the methods that figure out which element is closest to a given
  // point in the plane. The general strategy here is to choose a base
  // rectangle and move the provided point inside it using the period matrix.
  // This makes the problem finite, and we can precompute all faces that
  // intersect the base rectangle, figure out where the point is using them,
  // and then shift back to the real point/face using the period.

  // This helper function does the aforementioned precomputing. It returns
  // a base rectangle and a quad tree. The quad tree allows querying for all
  // faces that could potentially contain a given point in the base rectangle.
  // The helper is treated as lazy, so the computations occur the first time
  // a findXAt query is made.
  _computeRectMap(): [Rect, QuadTree<FKey>] {
    if (this._baseRect && this._quadTree) {
      return [this._baseRect, this._quadTree];
    }

    const periodMatrix = this.props.periodMatrix;
    const baseRectSize = getBaseRectSize(this.props.periodMatrix);
    // findFaceCover requires that a face in the 0,0 period intersects the base
    // rectangle, so we position the base rectangle to be centered at the first
    // vertex of the first face in 0,0.
    const firstFID = this.props.faces[0];
    const firstFace = [0, 0, firstFID];
    const firstVertex = this.getVerticesOnFace(firstFace)[0];
    const firstVCoords = this.getVertexCoordinates(firstVertex);
    const baseRect = [
      firstVCoords[0] - baseRectSize[0] / 2,
      firstVCoords[1] - baseRectSize[1] / 2,
      baseRectSize[0],
      baseRectSize[1],
    ];

    // findFaceCover doesn't care if the getTouchingFaces function returns
    // duplicates, so we allow them for simplicity.
    const getTouchingFaces = fid => {
      return this.getVerticesOnFace([0, 0, fid])
        .map(v => this.getFacesOnVertex(v))
        .reduce((a, b) => a.concat(b), []);
    };
    const faceCover = findFaceCover(
      baseRect,
      periodMatrix,
      this.props.faces,
      fid => this.getFaceCoordinates([0, 0, fid]),
      getTouchingFaces
    );

    // We now have a list of all faces intersecting the base rectangle, so all
    // that's left is to put them in a quad tree for querying.
    const quadTree = new QuadTree(baseRect);
    faceCover.forEach(([fKey, fRect]) => {
      quadTree.addRect(fRect, fKey);
    });

    this._baseRect = baseRect;
    this._quadTree = quadTree;
    return [baseRect, quadTree];
  }

  findFaceAt(point: Point): ?FKey {
    const {faces: [firstFID], periodMatrix} = this.props;
    const [baseRect, quadTree] = this._computeRectMap();

    // Move the point into the base rectangle using the period matrix.
    const [[px, py], reducedPoint] = reducePointWithShift(
      point,
      [baseRect[0], baseRect[1]],
      periodMatrix
    );
    // Query the quad tree for potential containing faces.
    let candFaces: Array<FKey> = quadTree
      .findRects(reducedPoint)
      .map(r => r[1]);
    candFaces = shiftFaces(candFaces, [px, py, firstFID]);
    // Figure out which face it is, if any.
    for (let i = 0; i < candFaces.length; i += 1) {
      const poly = this.getFaceCoordinates(candFaces[i]);
      if (isPointInPolygon(point, poly)) {
        return candFaces[i];
      }
    }
    return null;
  }
}
