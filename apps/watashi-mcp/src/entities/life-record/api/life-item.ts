import { Option, pipe } from "effect";

import { NOT_RETRACTED } from "#/shared/db/index.ts";

import { factStateOf } from "./life-filter.ts";
import type { Entry } from "./life-filter.ts";
import { refOf, timesOut } from "./life-record.ts";
import type { Body } from "./life-record.ts";

const retractedOf = ({ row }: Entry): Body =>
  pipe(
    Option.liftPredicate(row.retractedAt, (at) => at !== NOT_RETRACTED),
    Option.match({
      onNone: () => ({}),
      onSome: (at) => ({ retracted: { at, reason: row.retractReason } }),
    }),
  );

const stateOf = (entry: Entry, today: string): Body => {
  if (entry.row.record === "profile_fact") {
    return { state: factStateOf(today)(entry) };
  }
  return {};
};

export const itemOf =
  (today: string) =>
  (entry: Entry): Body => ({
    ref: refOf(entry.row),
    source: entry.row.source,
    ...timesOut(entry.row.record)(entry.body),
    ...stateOf(entry, today),
    ...retractedOf(entry),
  });
