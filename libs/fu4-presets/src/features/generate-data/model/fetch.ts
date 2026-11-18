import { Effect } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";

import { failedWith } from "./errors.ts";
import type { GenerateDataError } from "./errors.ts";

/** @internal */
export const fetchText = (
  url: string,
): Effect.Effect<string, GenerateDataError, HttpClient.HttpClient> =>
  HttpClient.get(url).pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap((response) => response.text),
    Effect.mapError(failedWith(`could not fetch ${url}`)),
    Effect.withSpan("fu4.fetch", { attributes: { "url.full": url } }),
  );
