// @flow

import {describe, it} from "mocha";
import {expect} from "chai";
import {check, gen} from "mocha-testcheck";

import {getBaseRectSize, reducePoint} from "../src/PlanePeriod.js";

const roundSanely = x => Math.round(x * 1000000000) / 1000000000;

const genCoord = gen.numberWithin(-10000, 10000).then(roundSanely);
const genPoint = gen.array([genCoord, genCoord]);

const genMEntry = gen.numberWithin(-100, 100).then(roundSanely);
// Allowing numbers close to zero results in too many singular matrices.
const genNZMEntry = gen
  .oneOf([gen.numberWithin(1, 100), gen.numberWithin(-100, -1)])
  .then(roundSanely);
// Not forcing some entries to be nonzero makes it too easy to be singular.
const genNonsingularM2 = gen
  .oneOf([
    gen.array([genNZMEntry, genMEntry, genMEntry, genNZMEntry]),
    gen.array([genMEntry, genNZMEntry, genNZMEntry, genMEntry]),
  ])
  .suchThat(([a, b, c, d]) => roundSanely(a * d - b * c) !== 0);

describe("getBaseRectSize", () => {
  it("should return two small positive numbers", () => {
    const [w, h] = getBaseRectSize([1, 2, 3, 4]);
    expect(w, "w type").to.be.a("number");
    expect(h, "h type").to.be.a("number");
    expect(w, "w range").to.be.within(0, 10);
    expect(h, "h range").to.be.within(0, 10);
  });
});

describe("reducePoint", () => {
  // See the math.js comments for the detailed explanation.
  it(
    "should return integer components and a point close to the origin",
    check(genPoint, genNonsingularM2, ([x, y], [a, b, c, d]) => {
      const [w, h] = getBaseRectSize([a, b, c, d]);
      const [[r, s], [t, u]] = reducePoint([x, y], [a, b, c, d]);
      expect(Math.round(r), "r integer").to.equal(r);
      expect(Math.round(s), "s integer").to.equal(s);
      expect(t, "x-coord in R").to.be.within(0, w);
      expect(u, "y-coord in R").to.be.within(0, h);
      expect(roundSanely(x), "x identity").to.equal(
        roundSanely(t + r * a + s * b)
      );
      expect(roundSanely(y), "y identity").to.equal(
        roundSanely(u + r * c + s * d)
      );
    })
  );
});
