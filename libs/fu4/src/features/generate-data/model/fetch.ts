import { Effect } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";

import { failedWith } from "#/shared/lib/errors.ts";
import type { Fu4Error } from "#/shared/lib/errors.ts";

/** @internal */
export const fetchText = (url: string): Effect.Effect<string, Fu4Error, HttpClient.HttpClient> =>
  HttpClient.get(url).pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap((response) => response.text),
    Effect.mapError(failedWith(`could not fetch ${url}`)),
    Effect.withSpan("fu4.fetch", { attributes: { "url.full": url } }),
  );
