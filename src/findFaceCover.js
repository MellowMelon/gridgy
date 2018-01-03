import type {Point, Rect, Matrix2} from "./math.js";
import type {FID, FKey} from "./Tesselation.types.js";

import {forEachObjNum} from "./utils.js";
import {doRectsIntersect, getBoundingBox, unionRects} from "./math.js";

// Given a rectangle, the period of a tesselation, and some properties of the
// tesselation faces (a list of FIDs, the polygons, the touching faces), return
// an array of all faces whose rectangular bounding boxes intersect the given
// rectangle. The rectangle must contain faces from the 0,0 period for this
// to work.

// All we do is compute the bounding rectangle of all faces in the base period,
// try the bounding rectangle for neighboring periods, then test each face for
// each working period. For finding neighboring periods to check, we go in 8
// directions from a working one, and we also use the periods of any touching
// faces.

// For an incomplete tesselation with a period matrix whose vectors form a
// small angle, it is possible this will miss some faces, but this is a fairly
// extreme case.

export default function findFaceCover(
  rect: Rect,
  periodMatrix: Matrix2,
  faceIDs: Array<FID>,
  getFacePolygon: FID => Array<Point>,
  getTouchingFaces: FID => Array<FKey>
): Array<[FKey, Rect]> {
  // Compute the rectangle of each face, as well as the one containing all of
  // them. This is for the base period only.
  const faceRectTable = {};
  const faceRectList = [];
  faceIDs.forEach(fid => {
    const r = getBoundingBox(getFacePolygon(fid));
    faceRectTable[fid] = r;
    faceRectList.push(r);
  });
  const baseAllFacesRect = unionRects(faceRectList);

  // Compute all periods where the bounding rectangle of faces intersects the
  // given one. Stored in periodsThatIntersect.
  const periodsThatIntersect = [];
  const neighborPeriods = computeNeighborPeriods(faceIDs, getTouchingFaces);
  const alreadyCheckedPeriods = {};
  function checkPeriod(px, py) {
    if (!alreadyCheckedPeriods[px + "," + py]) {
      alreadyCheckedPeriods[px + "," + py] = true;
      const allFacesRect = moveRect(baseAllFacesRect, periodMatrix, px, py);
      if (doRectsIntersect(rect, allFacesRect)) {
        periodsThatIntersect.push([px, py]);
        neighborPeriods.forEach(([qx, qy]) => checkPeriod(px + qx, py + qy));
      }
    }
  }
  checkPeriod(0, 0);

  // Within these periods, compute the faces whose rectangles intersect the
  // given one. This is our final result.
  const ret = [];
  periodsThatIntersect.forEach(([px, py]) => {
    forEachObjNum(faceRectTable, (faceRect, fid) => {
      faceRect = moveRect(faceRect, periodMatrix, px, py);
      if (doRectsIntersect(rect, faceRect)) {
        ret.push([[px, py, fid], faceRect]);
      }
    });
  });
  return ret;
}

function moveRect(r, [a, b, c, d], periodX, periodY) {
  return [
    r[0] + a * periodX + b * periodY,
    r[1] + c * periodX + d * periodY,
    r[2],
    r[3],
  ];
}

function computeNeighborPeriods(faceIDs, getTouchingFaces) {
  const retArray = [];
  // This is only used to avoid duplicates. We preinsert 0,0 which we don't
  // want in the return.
  const retTable = {"0,0": true};
  // Helper to only add to the return array if not added before.
  function add(x, y) {
    if (!retTable[x + "," + y]) {
      retTable[x + "," + y] = true;
      retArray.push([x, y]);
    }
  }
  add(-1, -1);
  add(-1, 0);
  add(-1, 1);
  add(0, -1);
  add(0, 1);
  add(1, -1);
  add(1, 0);
  add(1, 1);
  faceIDs.forEach(fid => {
    getTouchingFaces(fid).forEach(fKey => {
      add(fKey[0], fKey[1]);
    });
  });
  return retArray;
}
