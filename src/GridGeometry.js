// @flow

import type {Point, Rect} from "./math.js";
import type {
  FKey as FTess,
  EKey as ETess,
  VKey as VTess,
} from "./Tesselation.types.js";

type FKey = string;
type EKey = string;
type VKey = string;

import {getBoundingBox} from "./math.js";
import Tesselation from "./Tesselation.js";

type GeometryProps = {
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
};

function withDefault<T>(value: ?T, defaultValue: T): T {
  return value == null ? defaultValue : value;
}

export default class GridGeometry {
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
  _faceSet: Set<FKey>;
  _edgeList: Array<EKey>;
  _edgeSet: Set<EKey>;
  _vertexList: Array<VKey>;
  _vertexSet: Set<VKey>;
  _boundingBox: Rect;

  constructor(props: GeometryProps) {
    if (!props) {
      throw new Error("new GridGeometry: first parameter must be an object");
    } else if (!props.tesselation) {
      throw new Error("new GridGeometry: must pass tesselation");
    } else if (!props.faceList) {
      throw new Error("new GridGeometry: must pass faceList");
    }
    this.tesselation = props.tesselation;
    this.faceList = props.faceList;
    this.origin = withDefault(props.origin, [0, 0]);
    this.scale = withDefault(props.scale, 1);
    const defaultFromKey = k => k.join(",");
    this.fromFaceTessKey = withDefault(props.fromFaceTessKey, defaultFromKey);
    this.fromEdgeTessKey = withDefault(props.fromEdgeTessKey, defaultFromKey);
    this.fromVertexTessKey = withDefault(
      props.fromVertexTessKey,
      defaultFromKey
    );
    const defaultToKey3 = k => {
      const parts = k.split(",");
      return [parseInt(parts[0]), parseInt(parts[1]), parts[2]];
    };
    const defaultToKey4 = k => {
      const parts = k.split(",");
      return [
        parseInt(parts[0]),
        parseInt(parts[1]),
        parseInt(parts[2]),
        parts[3],
      ];
    };
    this.toFaceTessKey = withDefault(props.toFaceTessKey, defaultToKey3);
    this.toEdgeTessKey = withDefault(props.toEdgeTessKey, defaultToKey4);
    this.toVertexTessKey = withDefault(props.toVertexTessKey, defaultToKey3);
  }

  // Sets _faceSet variable if not set already.
  _computeFaceSet() {
    if (this._faceSet) {
      return;
    }
    this._faceSet = new Set();
    this.faceList.forEach(f => this._faceSet.add(f));
  }

  // Sets _edgeList and _edgeSet variables if not set already.
  _computeEdgeListAndSet() {
    if (this._edgeList && this._edgeSet) {
      return;
    }
    const edgeList = [];
    const edgeSet = new Set();
    this.faceList.forEach(f => {
      const tessF = this.toFaceTessKey(f);
      this.tesselation.getEdgesOnFace(tessF).forEach(tessE => {
        const e = this.fromEdgeTessKey(tessE);
        if (!edgeSet.has(e)) {
          edgeList.push(e);
          edgeSet.add(e);
        }
      });
    });
    this._edgeList = edgeList;
    this._edgeSet = edgeSet;
  }

  // Sets _vertexList and _vertexSet variables if not set already.
  _computeVertexListAndSet() {
    if (this._vertexList && this._vertexSet) {
      return;
    }
    const vertexList = [];
    const vertexSet = new Set();
    this.faceList.forEach(f => {
      const tessF = this.toFaceTessKey(f);
      this.tesselation.getVerticesOnFace(tessF).forEach(tessV => {
        const v = this.fromVertexTessKey(tessV);
        if (!vertexSet.has(v)) {
          vertexList.push(v);
          vertexSet.add(v);
        }
      });
    });
    this._vertexList = vertexList;
    this._vertexSet = vertexSet;
  }

  getFaceList(): Array<FKey> {
    return this.faceList;
  }

  getEdgeList(): Array<EKey> {
    this._computeEdgeListAndSet();
    return this._edgeList;
  }

  getVertexList(): Array<VKey> {
    this._computeVertexListAndSet();
    return this._vertexList;
  }

  hasFace(face: FKey): boolean {
    this._computeFaceSet();
    return this._faceSet.has(face);
  }

  hasEdge(edge: EKey): boolean {
    this._computeEdgeListAndSet();
    return this._edgeSet.has(edge);
  }

  hasVertex(vertex: VKey): boolean {
    this._computeVertexListAndSet();
    return this._vertexSet.has(vertex);
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

  _fromTessCoordinates([x, y]: Point): Point {
    const [ox, oy] = this.origin;
    return [this.scale * x + ox, this.scale * y + oy];
  }

  _toTessCoordinates([x, y]: Point): Point {
    const [ox, oy] = this.origin;
    return [(x - ox) / this.scale, (y - oy) / this.scale];
  }

  getFaceCoordinates(face: FKey): Array<Point> {
    return this.tesselation
      .getFaceCoordinates(this.toFaceTessKey(face))
      .map(p => this._fromTessCoordinates(p));
  }

  getEdgeCoordinates(edge: EKey): [Point, Point] {
    const [p1, p2] = this.tesselation.getEdgeCoordinates(
      this.toEdgeTessKey(edge)
    );
    return [this._fromTessCoordinates(p1), this._fromTessCoordinates(p2)];
  }

  getVertexCoordinates(vertex: VKey): Point {
    return this._fromTessCoordinates(
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
    const face = this.tesselation.findFaceAt(this._toTessCoordinates(point));
    return face && this.fromFaceTessKey(face);
  }

  findEdgeAt(point: Point): ?EKey {
    const edge = this.tesselation.findEdgeAt(this._toTessCoordinates(point));
    return edge && this.fromEdgeTessKey(edge);
  }

  findVertexAt(point: Point): ?VKey {
    const vertex = this.tesselation.findVertexAt(
      this._toTessCoordinates(point)
    );
    return vertex && this.fromVertexTessKey(vertex);
  }
}
