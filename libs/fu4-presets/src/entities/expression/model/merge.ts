import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import { ANY, STRING, arrayOf, isLoose, objectOf, sortedNames } from "./types.ts";
import type { ArrayType, ExprType, ObjectType } from "./types.ts";

export type Merge = (type: ExprType) => (other: ExprType) => ExprType;

const STRINGY: Readonly<Record<string, readonly string[]>> = {
  number: ["string"],
  bool: ["string"],
  string: ["string", "number", "bool"],
};

const mergedMapped =
  (recurse: Merge) =>
  (mine: ObjectType, other: ObjectType): Option.Option<ExprType> =>
    Option.match(mine.mapped, {
      onNone: () => other.mapped,
      onSome: (own) =>
        pipe(
          other.mapped,
          Option.map(recurse(own)),
          Option.orElse(() => mine.mapped),
        ),
    });

const mergedProp =
  (recurse: Merge) =>
  (mine: ObjectType, name: string, right: ExprType): ExprType =>
    Option.match(Rec.get(mine.props, name), {
      onNone: () => right,
      onSome: (left) => recurse(left)(right),
    });

const mergeObjects =
  (recurse: Merge) =>
  (mine: ObjectType, other: ObjectType): ExprType => {
    if (Rec.isEmptyRecord(mine.props) && isLoose(other)) {
      return other;
    }
    if (Rec.isEmptyRecord(other.props) && isLoose(mine)) {
      return mine;
    }
    const names = sortedNames(other.props);
    const added = pipe(
      names,
      Arr.filter((name) => !Rec.has(mine.props, name)),
    );
    const props = pipe(
      names,
      Arr.map((name): [string, ExprType] => [
        name,
        mergedProp(recurse)(mine, name, other.props[name] ?? ANY),
      ]),
      Rec.fromEntries,
    );
    const mapped = Arr.reduce(added, mergedMapped(recurse)(mine, other), (current, name) =>
      pipe(
        current,
        Option.map((found) => recurse(found)(other.props[name] ?? ANY)),
      ),
    );
    return objectOf({ ...mine.props, ...props })(mapped);
  };

const mergeArrays =
  (recurse: Merge) =>
  (mine: ArrayType, other: ArrayType): ExprType => {
    if (mine.elem.kind === "any") {
      return mine;
    }
    if (other.elem.kind === "any") {
      return other;
    }
    return arrayOf(recurse(mine.elem)(other.elem));
  };

export const merge: Merge = (type) => (other) => {
  if (type.kind === "object" && other.kind === "object") {
    return mergeObjects(merge)(type, other);
  }
  if (type.kind === "array" && other.kind === "array") {
    return mergeArrays(merge)(type, other);
  }
  if (type.kind === other.kind) {
    return type;
  }
  if (Option.exists(Rec.get(STRINGY, type.kind), Arr.contains<string>(other.kind))) {
    return STRING;
  }
  return ANY;
};
