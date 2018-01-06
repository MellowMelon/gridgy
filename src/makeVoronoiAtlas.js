import type {Point} from "./math.js";
import {getBoundingBox} from "./math.js";
import PolygonAtlas from "./PolygonAtlas.js";
import Voronoi from "voronoi";

// The collection polygons computed by the voronoi diagram may have epsilon
// sized gaps due to floating point rounding. We dilate all polygons about the
// voronoi site by this factor to avoid this issue.
const ENLARGE_AMOUNT = 1.000000001;

export default function makeVoronoiAtlas<T>(
  pointData: Array<[Point, T]>
): PolygonAtlas<T> {
  const pointList = pointData.map(p => p[0]);
  const pointIndexTable = new Map();
  pointList.forEach((p, i) => pointIndexTable.set(p.join(","), i));
  const bbRect = getBoundingBox(pointList);
  const vInst = new Voronoi();
  const diagram = vInst.compute(pointList.map(p => ({x: p[0], y: p[1]})), {
    xl: bbRect[0],
    xr: bbRect[0] + bbRect[2],
    yt: bbRect[1],
    yb: bbRect[1] + bbRect[3],
  });
  const vSitePermutation = diagram.cells.map(c =>
    pointIndexTable.get(c.site.x + "," + c.site.y)
  );
  const convertPointToArray = p => [p.x, p.y];
  const polygons = diagram.cells.map(c =>
    c.halfedges.map(e => convertPointToArray(e.getStartpoint()))
  );
  const atlas = new PolygonAtlas(bbRect);
  polygons.forEach((p, i) => {
    const pointDataIndex = vSitePermutation[i];
    p = enlargePolygon(p, pointData[pointDataIndex][0], ENLARGE_AMOUNT);
    atlas.addPolygon(p, pointData[pointDataIndex][1]);
  });
  return atlas;
}

function enlargePolygon(
  polygon: Array<Point>,
  about: Point,
  scale: number
): Array<Point> {
  const [x, y] = about;
  return polygon.map(([px, py]) => {
    return [px * scale + x * (1 - scale), py * scale + y * (1 - scale)];
  });
}
