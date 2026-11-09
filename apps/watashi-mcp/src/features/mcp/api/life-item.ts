import { Option, pipe } from "effect";

import { NOT_RETRACTED } from "#/features/mcp/model/life-record.table";

import { factStateOf } from "./life-filter";
import type { Entry } from "./life-filter";
import { refOf, timesOut } from "./life-record";
import type { Body } from "./life-record";

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

const itemOf =
  (today: string) =>
  (entry: Entry): Body => ({
    ref: refOf(entry.row),
    source: entry.row.source,
    ...timesOut(entry.row.record)(entry.body),
    ...stateOf(entry, today),
    ...retractedOf(entry),
  });

export { itemOf };
