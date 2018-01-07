// @flow

export type FID = string;
export type VID = string;

export type FKey = [number, number, FID];
export type EKey = [number, number, number, FID];
export type VKey = [number, number, VID];
export type XKey = FKey | EKey | VKey;
