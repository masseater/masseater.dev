import { useAtomValue } from "@effect/atom-react";
import type { Media } from "@masseater.dev/media-notes-protocol";
import { keyOf, runtime } from "@masseater.dev/media-notes-ui";
import type { Forecast, Pair, Statement } from "@masseater.dev/shirushi-protocol";
import { Array as Arr, pipe } from "effect";
import { AsyncResult } from "effect/reactivity";

import { fetchForecasts, fetchPairs, fetchStatements } from "#/shared/api/index.ts";

/** @internal */
export const pairsAtom = runtime.atom(fetchPairs);

/** @internal */
export const statementsAtom = runtime.atom(fetchStatements);

/** @internal */
export const forecastsAtom = runtime.atom(fetchForecasts);

export const usePairs = (): readonly Pair[] =>
  AsyncResult.getOrElse(useAtomValue(pairsAtom), Arr.empty);

export const useStatements = (): readonly Statement[] =>
  AsyncResult.getOrElse(useAtomValue(statementsAtom), Arr.empty);

const ofMedia =
  ({ source }: Media) =>
  ({ prediction }: Forecast): boolean =>
    keyOf(prediction.media.source) === keyOf(source);

export const useForecasts = (media: Media): readonly Forecast[] =>
  pipe(AsyncResult.getOrElse(useAtomValue(forecastsAtom), Arr.empty), Arr.filter(ofMedia(media)));
