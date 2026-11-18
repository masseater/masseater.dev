import { Option, String as Str, pipe } from "effect";

const NODE = "node";
const MINIMUM_NODE = 20;

export const isRetiredRuntime = (using: string): boolean =>
  pipe(
    Option.some(using),
    Option.filter(Str.startsWith(NODE)),
    Option.map((runtime) => Number(Str.slice(NODE.length)(runtime))),
    Option.exists((version) => Number.isInteger(version) && version < MINIMUM_NODE),
  );
