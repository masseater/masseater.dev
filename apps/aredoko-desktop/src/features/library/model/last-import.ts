import type { MutationStatus } from "@tanstack/react-query";
import { Option, Predicate, Schema, pipe } from "effect";

type LastImport =
  | { readonly status: "none" }
  | { readonly status: "pending" }
  | { readonly status: "placed"; readonly packages: number }
  | { readonly status: "failed"; readonly message: string };

const NO_IMPORT: LastImport = { status: "none" };

const FAILED = "取り込めませんでした";

const isPlaced = Schema.is(Schema.Int);

const messageOf = (error: unknown): string =>
  pipe(
    Option.liftPredicate(error, Predicate.isError),
    Option.map(({ message }) => message),
    Option.getOrElse(() => FAILED),
  );

const lastImportOf = ({
  status,
  data,
  error,
}: Readonly<{ status: MutationStatus; data: unknown; error: unknown }>): LastImport => {
  if (status === "error") {
    return { status: "failed", message: messageOf(error) };
  }
  if (status === "success" && isPlaced(data)) {
    return { status: "placed", packages: data };
  }
  if (status === "pending") {
    return { status: "pending" };
  }
  return NO_IMPORT;
};

export { NO_IMPORT, lastImportOf };
export type { LastImport };
