import { Array as Arr, Option, Order, Record as Rec, pipe } from "effect";

import type { RawValue } from "#/entities/workflow/model/job-types.ts";
import { quote } from "#/shared/text/index.ts";

import { containsExpression } from "./expression-text.ts";

export type Compare = (left: RawValue) => (right: RawValue) => boolean;

const sameProps = (
  compare: Compare,
  mine: Readonly<Record<string, RawValue>>,
  theirs: Readonly<Record<string, RawValue>>,
): boolean =>
  Rec.size(mine) === Rec.size(theirs) &&
  pipe(
    Rec.toEntries(mine),
    Arr.every(([name, value]) =>
      Option.exists(Rec.get(theirs, name), (other) => compare(value)(other)),
    ),
  );

const sameElems = (
  compare: Compare,
  mine: readonly RawValue[],
  theirs: readonly RawValue[],
): boolean =>
  mine.length === theirs.length &&
  pipe(
    Arr.zip(mine, theirs),
    Arr.every(([left, right]) => compare(left)(right)),
  );

export const rawEquals: Compare = (left) => (right) => {
  if (left.type === "object" && right.type === "object") {
    return sameProps(rawEquals, left.props, right.props);
  }
  if (left.type === "array" && right.type === "array") {
    return sameElems(rawEquals, left.elems, right.elems);
  }
  return left.type === "string" && right.type === "string" && left.value === right.value;
};

export const rawDescribe = (value: RawValue): string => {
  if (value.type === "object") {
    const parts = pipe(
      Rec.toEntries(value.props),
      Arr.map(([name, prop]) => `${quote(name)}: ${rawDescribe(prop)}`),
    );
    return `{${Arr.join(Arr.sort(parts, Order.String), ", ")}}`;
  }
  if (value.type === "array") {
    return `[${pipe(value.elems, Arr.map(rawDescribe), Arr.join(", "))}]`;
  }
  return quote(value.value);
};

const isExpression = (value: RawValue): boolean =>
  value.type === "string" && containsExpression(value.value);

const objectSubset = (compare: Compare, value: RawValue, sub: RawValue): boolean =>
  value.type === "object" &&
  sub.type === "object" &&
  pipe(
    Rec.toEntries(sub.props),
    Arr.every(([name, each]) =>
      Option.exists(Rec.get(value.props, name), (prop) => compare(prop)(each)),
    ),
  );

export const isSubset: Compare = (value) => (sub) => {
  if (isExpression(sub)) {
    return true;
  }
  if (value.type === "object") {
    return objectSubset(isSubset, value, sub);
  }
  if (value.type === "array") {
    return sub.type === "array" && sameElems(isSubset, value.elems, sub.elems);
  }
  return containsExpression(value.value) || rawEquals(value)(sub);
};
