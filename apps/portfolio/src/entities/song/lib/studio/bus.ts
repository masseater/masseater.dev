import { fieldOf } from "./field.ts";

export interface Bus {
  readonly left: Float32Array<ArrayBuffer>;
  readonly right: Float32Array<ArrayBuffer>;
  readonly mono: boolean;
  readonly name?: string;
}

export interface BusShape {
  readonly mono?: boolean;
  readonly name?: string;
}

export const busOf =
  (frames: number) =>
  ({ mono, name }: BusShape): Bus => {
    const left = new Float32Array(frames);
    const named = fieldOf("name")(name);
    if (mono === true) {
      return { left, right: left, mono: true, ...named };
    }
    return { left, right: new Float32Array(frames), mono: false, ...named };
  };
