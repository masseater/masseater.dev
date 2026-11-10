import { queryOptions, useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import { Effect, ManagedRuntime, Option } from "effect";
import { FetchHttpClient, HttpClient } from "effect/http";

import { useChoice } from "#/pages/extract/model/draft";
import type { Choice } from "#/pages/extract/model/draft";

import { asPng } from "./as-png";

type Picture =
  | { readonly status: "none" }
  | { readonly status: "loading"; readonly name: string }
  | { readonly status: "failed"; readonly name: string; readonly reason: string }
  | {
      readonly status: "ready";
      readonly name: string;
      readonly bytes: Uint8Array;
      readonly url: string;
    };

const runtime = ManagedRuntime.make(FetchHttpClient.layer);

const NO_TYPE = "";

const typeOf = (headers: Readonly<Record<string, string | undefined>>): string =>
  Option.fromNullishOr(headers["content-type"]).pipe(Option.getOrElse(() => NO_TYPE));

const bytesOf = (url: string): Promise<Uint8Array> =>
  runtime.runPromise(
    HttpClient.get(url).pipe(
      Effect.flatMap((response) =>
        response.arrayBuffer.pipe(
          Effect.map((buffer) => ({
            bytes: new Uint8Array(buffer),
            type: typeOf(response.headers),
          })),
        ),
      ),
      Effect.flatMap(asPng),
    ),
  );

const NO_URL = "";

const urlOf = (choice: Choice): string => {
  if (choice.status === "none") {
    return NO_URL;
  }
  return choice.url;
};

const useBytes = (url: string): UseQueryResult<Uint8Array> =>
  useQuery(
    queryOptions({
      queryKey: ["picture", url],
      queryFn: () => bytesOf(url),
      enabled: url !== NO_URL,
      staleTime: "static",
    }),
  );

const usePicture = (): Picture => {
  const choice = useChoice();
  const query = useBytes(urlOf(choice));
  if (choice.status === "none") {
    return { status: "none" };
  }
  const { name, url } = choice;
  if (query.status === "success") {
    return { status: "ready", name, bytes: query.data, url };
  }
  if (query.status === "error") {
    return { status: "failed", name, reason: query.error.message };
  }
  return { status: "loading", name };
};

export type { Picture };
export { usePicture };
