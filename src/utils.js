// @flow
/* global $ReadOnlyArray */

export function forEachObj<K, V>(obj: {[K]: V}, f: (V, string) => mixed) {
  for (const k in obj) {
    if (obj.hasOwnProperty(k)) {
      f(obj[(k: any)], k);
    }
  }
}

export function isObject(obj: mixed): boolean {
  return !!obj && typeof obj === "object";
}

export function mapValues<K, V, U>(
  obj: {[K]: V},
  f: (V, string) => U
): {[K]: U} {
  const newObj = {};
  forEachObj(obj, (v, k) => (newObj[k] = f(v, k)));
  return newObj;
}

export function orderArrays<T: $ReadOnlyArray<number | string>>(
  a1: T,
  a2: T
): [T, T] {
  for (let i = 0; i < a1.length; i += 1) {
    // We're okay with string+number inequality comparisons here
    if (a2.length <= i || (a1[i]: any) > a2[i]) {
      return [a2, a1];
    } else if ((a1[i]: any) < a2[i]) {
      return [a1, a2];
    }
  }
  return [a1, a2];
}

export function union<T>(
  nestedArray: Array<Array<T>>,
  without: ?Array<T>,
  stringify: T => string = String
): Array<T> {
  const seenTable = {};
  without &&
    without.forEach(el => {
      seenTable[stringify(el)] = true;
    });
  const ret = [];
  nestedArray.forEach(elArray => {
    elArray.forEach(el => {
      const seenKey = stringify(el);
      if (!seenTable[seenKey]) {
        seenTable[seenKey] = true;
        ret.push(el);
      }
    });
  });
  return ret;
}
