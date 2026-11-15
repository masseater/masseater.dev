import { Effect } from "effect";

import { effect2rs } from "./index.ts";
import type { UnsupportedSchema } from "./index.ts";

const HEADER = "// test";

export const rustWith =
  (derive: readonly string[]) =>
  (definitions: Readonly<Record<string, unknown>>): Effect.Effect<string, UnsupportedSchema> =>
    effect2rs({ definitions, header: HEADER, derive });

export const rust = rustWith([]);

export const failure = (
  definitions: Readonly<Record<string, unknown>>,
): Effect.Effect<UnsupportedSchema, string> =>
  Effect.flip(effect2rs({ definitions, header: HEADER }));
