import { Option } from "effect";
import { ModuleKind } from "typescript/sync";

import type { ResolutionMode } from "./resolution-types.ts";

const MODE_NUMBERS: Readonly<Record<ResolutionMode, ModuleKind>> = {
  CommonJS: ModuleKind.CommonJS,
  ESNext: ModuleKind.ESNext,
};

const MODES_BY_NUMBER: ReadonlyMap<number, ResolutionMode> = new Map([
  [ModuleKind.CommonJS, "CommonJS"],
  [ModuleKind.ESNext, "ESNext"],
]);

const modeFromNumber = (mode: number | undefined): Option.Option<ResolutionMode> =>
  Option.fromNullishOr(mode).pipe(
    Option.flatMap((value) => Option.fromNullishOr(MODES_BY_NUMBER.get(value))),
  );

const modeToNumber = (mode: ResolutionMode): ModuleKind => MODE_NUMBERS[mode];

export { modeFromNumber, modeToNumber };
