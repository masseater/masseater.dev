import { queryOptions, useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import { Effect, ManagedRuntime } from "effect";
import { FetchHttpClient, HttpClient } from "effect/http";

import { useChoice } from "#/pages/extract/model/draft";
import type { Choice } from "#/pages/extract/model/draft";

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

const bytesOf = (url: string): Promise<Uint8Array> =>
  runtime.runPromise(
    HttpClient.get(url).pipe(
      Effect.flatMap((response) => response.arrayBuffer),
      Effect.map((buffer) => new Uint8Array(buffer)),
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
