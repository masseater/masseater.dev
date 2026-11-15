import { Array as Arr, Order, Record as Rec, pipe } from "effect";

import { fingerprint } from "./fingerprint.ts";
import type { Finding } from "./fingerprint.ts";

const counts = (findings: readonly Finding[]): readonly string[] =>
  pipe(
    findings,
    Arr.groupBy((found): string => found.kind),
    Rec.toEntries,
    Arr.map(([kind, group]) => `${kind}: ${String(group.length)}`),
    Arr.sortWith((line: string) => line, Order.String),
  );

const reported = (
  findings: readonly Finding[],
): readonly Readonly<{ fingerprint: string; line: string }>[] =>
  pipe(
    findings,
    Arr.map((found) => ({ fingerprint: fingerprint(found), line: found.detail })),
  );

export { counts, reported };
