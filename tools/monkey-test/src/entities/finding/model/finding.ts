import { Array as Arr, Order, Schema, String as Str, pipe } from "effect";

const MAX_DETAIL = 240;

const FindingKind = Schema.Literals([
  "cli-startup",
  "cli-crash",
  "cli-hang",
  "page-load",
  "page-error",
  "page-server-error",
  "desktop-load",
  "desktop-error",
  "desktop-server-error",
  "mcp-contract",
  "mcp-server-error",
  "mcp-crash",
  "mcp-hang",
]);

export const FindingSchema = Schema.Struct({
  kind: FindingKind,
  target: Schema.String,
  detail: Schema.String,
});

export type Finding = typeof FindingSchema.Type;

const oneLine = (text: string): string =>
  pipe(text, Str.replaceAll(/\s+/gu, " "), Str.trim, Str.takeLeft(MAX_DETAIL));

export const findingOf = (found: Finding): Finding => ({
  kind: found.kind,
  target: oneLine(found.target),
  detail: oneLine(found.detail),
});

export const lineOf = ({ kind, target, detail }: Finding): string => `${kind} ${target} ${detail}`;

export const sortedFindings = (findings: readonly Finding[]): readonly Finding[] =>
  pipe(
    findings,
    Arr.map((found) => findingOf(found)),
    Arr.dedupeWith((left, right) => lineOf(left) === lineOf(right)),
    Arr.sortWith((found) => lineOf(found), Order.String),
  );
