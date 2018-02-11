// @flow

import type {Point, Rect} from "./math.js";
import type {
  FKey as FTess,
  EKey as ETess,
  VKey as VTess,
} from "./Tesselation.types.js";

import {getBoundingBox} from "./math.js";
import Tesselation from "./Tesselation.js";

type ElToStringFunc<FKey, EKey, VKey> = (
  FKey | EKey | VKey,
  "f" | "e" | "v"
) => string;

export type GridProps<FKey, EKey, VKey> = {
  tesselation: Tesselation,
  faceList: Array<FKey>,
  origin?: Point,
  scale?: number,
  fromFaceTessKey?: FTess => FKey,
  fromEdgeTessKey?: ETess => EKey,
  fromVertexTessKey?: VTess => VKey,
  toFaceTessKey?: FKey => FTess,
  toEdgeTessKey?: EKey => ETess,
  toVertexTessKey?: VKey => VTess,
  elToString?: ElToStringFunc<FKey, EKey, VKey>,
};

type GridPropsRet<FKey, EKey, VKey> = {
  tesselation: Tesselation,
  faceList: Array<FKey>,
  origin: Point,
  scale: number,
  fromFaceTessKey: FTess => FKey,
  fromEdgeTessKey: ETess => EKey,
  fromVertexTessKey: VTess => VKey,
  toFaceTessKey: FKey => FTess,
  toEdgeTessKey: EKey => ETess,
  toVertexTessKey: VKey => VTess,
  elToString: ElToStringFunc<FKey, EKey, VKey>,
};

function withDefault<T>(value: ?T, defaultValue: T): T {
  return value == null ? defaultValue : value;
}

// Sets _faceSet variable if not set already.
function computeFaceSet<FKey, EKey, VKey>(g: Grid<FKey, EKey, VKey>) {
  if (g._faceSet) {
    return;
  }
  g._faceSet = new Set();
  g.faceList.forEach(f => g._faceSet.add(g.elToString(f, "f")));
}

// Sets _edgeList and _edgeSet variables if not set already.
function computeEdgeListAndSet<FKey, EKey, VKey>(g: Grid<FKey, EKey, VKey>) {
  if (g._edgeList && g._edgeSet) {
    return;
  }
  const edgeList = [];
  const edgeSet = new Set();
  g.faceList.forEach(f => {
    const tessF = g.toFaceTessKey(f);
    g.tesselation.getEdgesOnFace(tessF).forEach(tessE => {
      const e = g.fromEdgeTessKey(tessE);
      const eStr = g.elToString(e, "e");
      if (!edgeSet.has(eStr)) {
        edgeList.push(e);
        edgeSet.add(eStr);
      }
    });
  });
  g._edgeList = edgeList;
  g._edgeSet = edgeSet;
}

// Sets _vertexList and _vertexSet variables if not set already.
function computeVertexListAndSet<FKey, EKey, VKey>(g: Grid<FKey, EKey, VKey>) {
  if (g._vertexList && g._vertexSet) {
    return;
  }
  const vertexList = [];
  const vertexSet = new Set();
  g.faceList.forEach(f => {
    const tessF = g.toFaceTessKey(f);
    g.tesselation.getVerticesOnFace(tessF).forEach(tessV => {
      const v = g.fromVertexTessKey(tessV);
      const vStr = g.elToString(v, "v");
      if (!vertexSet.has(vStr)) {
        vertexList.push(v);
        vertexSet.add(vStr);
      }
    });
  });
  g._vertexList = vertexList;
  g._vertexSet = vertexSet;
}

function fromTessCoordinates<FKey, EKey, VKey>(
  g: Grid<FKey, EKey, VKey>,
  [x, y]: Point
): Point {
  const [ox, oy] = g.origin;
  return [g.scale * x + ox, g.scale * y + oy];
}

function toTessCoordinates<FKey, EKey, VKey>(
  g: Grid<FKey, EKey, VKey>,
  [x, y]: Point
): Point {
  const [ox, oy] = g.origin;
  return [(x - ox) / g.scale, (y - oy) / g.scale];
}

export default class Grid<FKey, EKey, VKey> {
  tesselation: Tesselation;
  faceList: Array<FKey>;
  origin: Point;
  scale: number;
  fromFaceTessKey: FTess => FKey;
  fromEdgeTessKey: ETess => EKey;
  fromVertexTessKey: VTess => VKey;
  toFaceTessKey: FKey => FTess;
  toEdgeTessKey: EKey => ETess;
  toVertexTessKey: VKey => VTess;
  elToString: ElToStringFunc<FKey, EKey, VKey>;
  _faceSet: Set<string>;
  _edgeList: Array<EKey>;
  _edgeSet: Set<string>;
  _vertexList: Array<VKey>;
  _vertexSet: Set<string>;
  _boundingBox: Rect;

  constructor(props: GridProps<FKey, EKey, VKey>) {
    if (!props) {
      throw new Error("new Grid: first parameter must be an object");
    } else if (!props.tesselation) {
      throw new Error("new Grid: must pass tesselation");
    } else if (!props.faceList) {
      throw new Error("new Grid: must pass faceList");
    }
    this.tesselation = props.tesselation;
    this.faceList = props.faceList;
    this.origin = withDefault(props.origin, [0, 0]);
    this.scale = withDefault(props.scale, 1);

    const id = x => (x: any);
    this.fromFaceTessKey = withDefault(props.fromFaceTessKey, id);
    this.fromEdgeTessKey = withDefault(props.fromEdgeTessKey, id);
    this.fromVertexTessKey = withDefault(props.fromVertexTessKey, id);
    this.toFaceTessKey = withDefault(props.toFaceTessKey, id);
    this.toEdgeTessKey = withDefault(props.toEdgeTessKey, id);
    this.toVertexTessKey = withDefault(props.toVertexTessKey, id);

    this.elToString = withDefault(props.elToString, String);
  }

  getProps(): GridPropsRet<FKey, EKey, VKey> {
    return {
      tesselation: this.tesselation,
      faceList: this.faceList,
      origin: this.origin,
      scale: this.scale,
      fromFaceTessKey: this.fromFaceTessKey,
      fromEdgeTessKey: this.fromEdgeTessKey,
      fromVertexTessKey: this.fromVertexTessKey,
      toFaceTessKey: this.toFaceTessKey,
      toEdgeTessKey: this.toEdgeTessKey,
      toVertexTessKey: this.toVertexTessKey,
      elToString: this.elToString,
    };
  }

  getFaceList(): Array<FKey> {
    return this.faceList;
  }

  getEdgeList(): Array<EKey> {
    computeEdgeListAndSet(this);
    return this._edgeList;
  }

  getVertexList(): Array<VKey> {
    computeVertexListAndSet(this);
    return this._vertexList;
  }

  hasFace(face: FKey): boolean {
    computeFaceSet(this);
    return this._faceSet.has(this.elToString(face, "f"));
  }

  getCanonicalEdge(edge: EKey): EKey {
    let canonicalEdge = this.toEdgeTessKey(edge);
    canonicalEdge = this.tesselation.getCanonicalEdge(canonicalEdge);
    return this.fromEdgeTessKey(canonicalEdge);
  }

  hasEdge(edge: EKey): boolean {
    computeEdgeListAndSet(this);
    let has = this._edgeSet.has(this.elToString(edge, "e"));
    if (!has) {
      // This might throw if the edge is in a completely wrong format, and
      // the hasX methods need to be forgiving about that.
      try {
        const canonicalEdge = this.getCanonicalEdge(edge);
        has = this._edgeSet.has(this.elToString(canonicalEdge, "e"));
      } catch (ex) {
        has = false;
      }
    }
    return has;
  }

  hasVertex(vertex: VKey): boolean {
    computeVertexListAndSet(this);
    return this._vertexSet.has(this.elToString(vertex, "v"));
  }

  getEdgesOnFace(face: FKey): Array<EKey> {
    return this.tesselation
      .getEdgesOnFace(this.toFaceTessKey(face))
      .map(e => this.fromEdgeTessKey(e));
  }

  getVerticesOnFace(face: FKey): Array<VKey> {
    return this.tesselation
      .getVerticesOnFace(this.toFaceTessKey(face))
      .map(v => this.fromVertexTessKey(v));
  }

  getFacesOnEdge(edge: EKey): Array<FKey> {
    return this.tesselation
      .getFacesOnEdge(this.toEdgeTessKey(edge))
      .map(f => this.fromFaceTessKey(f));
  }

  getVerticesOnEdge(edge: EKey): Array<VKey> {
    return this.tesselation
      .getVerticesOnEdge(this.toEdgeTessKey(edge))
      .map(v => this.fromVertexTessKey(v));
  }

  getFacesOnVertex(vertex: VKey): Array<FKey> {
    return this.tesselation
      .getFacesOnVertex(this.toVertexTessKey(vertex))
      .map(f => this.fromFaceTessKey(f));
  }

  getEdgesOnVertex(vertex: VKey): Array<EKey> {
    return this.tesselation
      .getEdgesOnVertex(this.toVertexTessKey(vertex))
      .map(e => this.fromEdgeTessKey(e));
  }

  getAdjacentFaces(face: FKey): Array<FKey> {
    return this.tesselation
      .getAdjacentFaces(this.toFaceTessKey(face))
      .map(f => this.fromFaceTessKey(f));
  }

  getTouchingFaces(face: FKey): Array<FKey> {
    return this.tesselation
      .getTouchingFaces(this.toFaceTessKey(face))
      .map(f => this.fromFaceTessKey(f));
  }

  getSurroundingEdges(edge: EKey): Array<EKey> {
    return this.tesselation
      .getSurroundingEdges(this.toEdgeTessKey(edge))
      .map(e => this.fromEdgeTessKey(e));
  }

  getTouchingEdges(edge: EKey): Array<EKey> {
    return this.tesselation
      .getTouchingEdges(this.toEdgeTessKey(edge))
      .map(e => this.fromEdgeTessKey(e));
  }

  getSurroundingVertices(vertex: VKey): Array<VKey> {
    return this.tesselation
      .getSurroundingVertices(this.toVertexTessKey(vertex))
      .map(v => this.fromVertexTessKey(v));
  }

  getAdjacentVertices(vertex: VKey): Array<VKey> {
    return this.tesselation
      .getAdjacentVertices(this.toVertexTessKey(vertex))
      .map(v => this.fromVertexTessKey(v));
  }

  getOtherFace(face: FKey, edge: EKey): ?FKey {
    const ret = this.tesselation.getOtherFace(
      this.toFaceTessKey(face),
      this.toEdgeTessKey(edge)
    );
    return ret && this.fromFaceTessKey(ret);
  }

  getOtherVertex(vertex: VKey, edge: EKey): ?VKey {
    const ret = this.tesselation.getOtherVertex(
      this.toVertexTessKey(vertex),
      this.toEdgeTessKey(edge)
    );
    return ret && this.fromVertexTessKey(ret);
  }

  isEdgeInside(edge: EKey): boolean {
    const tessFaces = this.tesselation.getFacesOnEdge(this.toEdgeTessKey(edge));
    const [f1, f2] = tessFaces.map(f => this.fromFaceTessKey(f));
    return this.hasFace(f1) && this.hasFace(f2);
  }

  isEdgeOnBorder(edge: EKey): boolean {
    return this.hasEdge(edge) && !this.isEdgeInside(edge);
  }

  isEdgeOutside(edge: EKey): boolean {
    return !this.hasEdge(edge);
  }

  getFaceCoordinates(face: FKey): Array<Point> {
    return this.tesselation
      .getFaceCoordinates(this.toFaceTessKey(face))
      .map(p => fromTessCoordinates(this, p));
  }

  getEdgeCoordinates(edge: EKey): [Point, Point] {
    const [p1, p2] = this.tesselation.getEdgeCoordinates(
      this.toEdgeTessKey(edge)
    );
    return [fromTessCoordinates(this, p1), fromTessCoordinates(this, p2)];
  }

  getVertexCoordinates(vertex: VKey): Point {
    return fromTessCoordinates(
      this,
      this.tesselation.getVertexCoordinates(this.toVertexTessKey(vertex))
    );
  }

  getBoundingBox(): Rect {
    if (!this._boundingBox) {
      const vPoints = this.getVertexList().map(v =>
        this.getVertexCoordinates(v)
      );
      this._boundingBox = getBoundingBox(vPoints);
    }
    return this._boundingBox;
  }

  findFaceAt(point: Point): ?FKey {
    const face = this.tesselation.findFaceAt(toTessCoordinates(this, point));
    return face && this.fromFaceTessKey(face);
  }

  findEdgeAt(point: Point): ?EKey {
    const edge = this.tesselation.findEdgeAt(toTessCoordinates(this, point));
    return edge && this.fromEdgeTessKey(edge);
  }

  findVertexAt(point: Point): ?VKey {
    const vertex = this.tesselation.findVertexAt(
      toTessCoordinates(this, point)
    );
    return vertex && this.fromVertexTessKey(vertex);
  }
}
