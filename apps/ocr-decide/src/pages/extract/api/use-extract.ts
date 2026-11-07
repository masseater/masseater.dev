import { INVOICE_FIELDS, extract, openRouterWithKey } from "@r_masseater/ocr-decide";
import type { FieldValue } from "@r_masseater/ocr-decide";
import { useMutation } from "@tanstack/react-query";
import { Duration, Effect, Layer } from "effect";

import type { Way } from "#/pages/extract/model/ways";

type Outcome =
  | { readonly status: "failed"; readonly reason: string }
  | {
      readonly status: "done";
      readonly values: Readonly<Record<string, FieldValue>>;
      readonly costUsd: number;
      readonly seconds: number;
    };

interface Request {
  readonly bytes: Uint8Array;
  readonly apiKey: string;
  readonly way: Way;
}

type ExtractState =
  | { readonly status: "idle" }
  | { readonly status: "running" }
  | { readonly status: "finished"; readonly outcome: Outcome };

const reasonOf = (error: Readonly<{ message: string; reason?: string }>): string =>
  error.reason ?? error.message;

const outcomeOf = ({ bytes, apiKey, way }: Request): Promise<Outcome> => {
  const run = extract({
    image: bytes,
    fields: INVOICE_FIELDS,
    method: way.method,
    model: way.model,
  });
  return Effect.runPromise(
    Layer.build(openRouterWithKey(apiKey)).pipe(
      Effect.flatMap((context) => Effect.provideContext(Effect.timed(run), context)),
      Effect.scoped,
      Effect.match({
        onFailure: (error): Outcome => ({ status: "failed", reason: reasonOf(error) }),
        onSuccess: ([elapsed, { values, costUsd }]): Outcome => ({
          status: "done",
          values,
          costUsd,
          seconds: Duration.toSeconds(elapsed),
        }),
      }),
    ),
  );
};

const useExtract = (): Readonly<{ state: ExtractState; start: (request: Request) => void }> => {
  const mutation = useMutation({ mutationFn: outcomeOf });
  if (mutation.status === "pending") {
    return { state: { status: "running" }, start: mutation.mutate };
  }
  if (mutation.status === "success") {
    return { state: { status: "finished", outcome: mutation.data }, start: mutation.mutate };
  }
  if (mutation.status === "error") {
    return {
      state: { status: "finished", outcome: { status: "failed", reason: mutation.error.message } },
      start: mutation.mutate,
    };
  }
  return { state: { status: "idle" }, start: mutation.mutate };
};

export type { ExtractState, Outcome };
export { useExtract };
