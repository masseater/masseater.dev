export type Stem = Readonly<Record<"n", number>> &
  Readonly<{
    name: string;
    scale: number;
    segs: Int32Array<ArrayBuffer>;
    data: Int16Array<ArrayBuffer>;
    drum: boolean;
  }>;

export type Unpacked = Readonly<Record<"L" | "R", Float32Array<ArrayBuffer>>>;

export interface Engine {
  readonly SR: number;
  readonly unpack: (stem: Stem) => Unpacked;
}

export declare const engineModule: () => Engine;
