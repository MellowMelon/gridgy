// @flow
/* global $ReadOnlyArray */

export function forEachObj<K, V>(obj: {[K]: V}, f: (V, string) => mixed) {
  for (const k in obj) {
    if (obj.hasOwnProperty(k)) {
      f(obj[(k: any)], k);
    }
  }
}

// forEachObj but treating the keys as integers
export function forEachObjNum<K, V>(obj: {[K]: V}, f: (V, number) => mixed) {
  forEachObj(obj, (v, k) => f(v, parseInt(k)));
}

export function mapValues<K, V, U>(
  obj: {[K]: V},
  f: (V, string) => U
): {[K]: U} {
  const newObj = {};
  forEachObj(obj, (v, k) => (newObj[k] = f(v, k)));
  return newObj;
}

export function orderArrays(
  a1: $ReadOnlyArray<number>,
  a2: $ReadOnlyArray<number>
): [$ReadOnlyArray<number>, $ReadOnlyArray<number>] {
  for (let i = 0; i < a1.length; i += 1) {
    if (a2.length <= i || a1[i] > a2[i]) {
      return [a2, a1];
    } else if (a1[i] < a2[i]) {
      return [a1, a2];
    }
  }
  return [a1, a2];
}
