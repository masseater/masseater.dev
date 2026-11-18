import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import type { ExprType, ObjectType, Props } from "./types.ts";

type Assignable = (type: ExprType) => (other: ExprType) => boolean;

const allOf =
  (props: Props) =>
  (test: (type: ExprType) => boolean): boolean =>
    pipe(Rec.values(props), Arr.every(test));

const strictInto =
  (recurse: Assignable) =>
  (mine: ObjectType, other: ObjectType): boolean =>
    pipe(
      Rec.toEntries(other.props),
      Arr.every(([name, right]) =>
        Option.exists(Rec.get(mine.props, name), (left) => recurse(left)(right)),
      ),
    );

const objectInto =
  (recurse: Assignable) =>
  (mine: ObjectType, other: ObjectType): boolean => {
    if (Option.isSome(mine.mapped) && Option.isSome(other.mapped)) {
      return recurse(mine.mapped.value)(other.mapped.value);
    }
    if (Option.isSome(mine.mapped)) {
      return allOf(other.props)(recurse(mine.mapped.value));
    }
    if (Option.isSome(other.mapped)) {
      const theirs = other.mapped.value;
      return allOf(mine.props)((type) => recurse(type)(theirs));
    }
    return strictInto(recurse)(mine, other);
  };

const SCALARS: Readonly<Record<string, readonly string[]>> = {
  null: ["null"],
  number: ["number"],
  string: ["string", "number"],
};

export const assignable: Assignable = (type) => (other) => {
  if (type.kind === "any" || type.kind === "bool" || other.kind === "any") {
    return true;
  }
  if (type.kind === "object") {
    return other.kind === "object" && objectInto(assignable)(type, other);
  }
  if (type.kind === "array") {
    return other.kind === "array" && assignable(type.elem)(other.elem);
  }
  return Option.exists(Rec.get(SCALARS, type.kind), Arr.contains<string>(other.kind));
};
