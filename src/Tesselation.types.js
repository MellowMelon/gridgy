export type FID = number;
export type VID = number;

export type FKey = [number, number, FID];
export type EKey = [number, number, FID, number];
export type VKey = [number, number, VID];
export type XKey = FKey | EKey | VKey;
