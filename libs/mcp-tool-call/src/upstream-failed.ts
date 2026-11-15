import { Option, Predicate, Schema } from "effect";

const taggedError = Schema.TaggedError;

export class UpstreamFailed extends taggedError<
  UpstreamFailed,
  { readonly brand: unique symbol }
>()("UpstreamFailed", { service: Schema.String, message: Schema.String }) {}

export const failedAt =
  (service: string) =>
  (cause: unknown): UpstreamFailed =>
    UpstreamFailed.make({
      service,
      message: Option.liftPredicate(cause, Predicate.isError).pipe(
        Option.match({ onNone: () => String(cause), onSome: (error) => error.message }),
      ),
    });
