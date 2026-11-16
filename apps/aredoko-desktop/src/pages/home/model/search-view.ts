import type { SearchResult } from "@masseater.dev/aredoko-protocol";
import { Array, Option, pipe } from "effect";
import type { ComponentProps } from "react";

import type { Notice } from "#/shared/ui/notice.tsx";

type Results = readonly (typeof SearchResult.Type)[];

export type SearchPhase = "idle" | "searching" | "settled";

export type SearchView =
  | Readonly<{ status: "idle" }>
  | Readonly<{
      status: "message";
      text: string;
      tone: NonNullable<ComponentProps<typeof Notice>["tone"]>;
    }>
  | Readonly<{ status: "results"; matches: Results; others: Results }>;

const SEARCHING = "探しています…";
const MATCH_FLOOR = 0.72;

const viewOfResults = (results: Results): SearchView => {
  const isMatch = ({ score }: (typeof results)[number]): boolean => score >= MATCH_FLOOR;
  return {
    status: "results",
    matches: pipe(results, Array.filter(isMatch)),
    others: pipe(
      results,
      Array.filter((result) => !isMatch(result)),
    ),
  };
};

export const searchViewOf = ({
  phase,
  failure,
  results,
}: Readonly<{
  phase: SearchPhase;
  failure: Option.Option<string>;
  results: Option.Option<Results>;
}>): SearchView => {
  if (phase === "idle") {
    return { status: "idle" };
  }
  if (Option.isSome(failure)) {
    return { status: "message", text: failure.value, tone: "error" };
  }
  return pipe(
    results,
    Option.filter(() => phase === "settled"),
    Option.match({
      onNone: (): SearchView => ({ status: "message", text: SEARCHING, tone: "muted" }),
      onSome: viewOfResults,
    }),
  );
};
