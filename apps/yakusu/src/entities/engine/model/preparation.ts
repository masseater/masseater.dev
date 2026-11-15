import { Option } from "effect";

import type { Progress } from "#/shared/api";

export type Preparation =
  | Readonly<{ status: "preparing" }>
  | Readonly<{ status: "downloading"; progress: Progress }>
  | Readonly<{ status: "ready" }>
  | Readonly<{ status: "failed"; message: string }>;

export type PreparationView = Readonly<{
  progress: Option.Option<Progress>;
  failure: Option.Option<string>;
  isFetching: boolean;
  isSuccess: boolean;
}>;

export const preparationOf = (view: PreparationView): Preparation => {
  if (view.isFetching) {
    return Option.match(view.progress, {
      onNone: (): Preparation => ({ status: "preparing" }),
      onSome: (progress): Preparation => ({ status: "downloading", progress }),
    });
  }
  if (Option.isSome(view.failure)) {
    return { status: "failed", message: view.failure.value };
  }
  if (view.isSuccess) {
    return { status: "ready" };
  }
  return { status: "preparing" };
};

const BYTES_PER_MEGABYTE = 1_000_000;

const megabytes = (bytes: number): string =>
  Math.floor(bytes / BYTES_PER_MEGABYTE).toLocaleString("ja-JP");

export const amountOf = ({ received, total }: Progress): string =>
  `${megabytes(received)} / ${megabytes(total)} MB`;
