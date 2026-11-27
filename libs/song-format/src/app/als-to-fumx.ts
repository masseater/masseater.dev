import { Effect } from "effect";

import { alsToFumx } from "#/features/convert-als/index.ts";
import type { LiveSetFile } from "#/features/convert-als/index.ts";

import { roundTrip } from "./round-trip.ts";

export interface LiveSetSource extends LiveSetFile {
  readonly path: string;
}

export const convertLiveSetFile = Effect.fn("convertLiveSetFile")(function* convert(
  source: LiveSetSource,
) {
  const fumx = yield* alsToFumx(source);
  return yield* roundTrip(source.path, fumx);
});
