import { Array as Arr, Match } from "effect";

import type { TypeRef } from "#generated/langium/ast.ts";

import type { From } from "./problem.ts";
import type { Measure, Value } from "./values.ts";

export type Scalar = Exclude<Value["kind"], "list">;

export type Type =
  | { readonly kind: Scalar }
  | { readonly kind: "list"; readonly element: Type }
  | { readonly kind: "unknown" };

export const UNKNOWN: Type = { kind: "unknown" };

export const MEASURES: readonly Measure[] = ["decibels", "percent", "hertz", "time", "semitones"];

export const scalar: From<Scalar, Type> = (kind) => ({ kind });

export const listOf: From<Type, Type> = (element) => ({ kind: "list", element });

export const typeOfRef: From<TypeRef, Type> = (node) =>
  Match.value(node).pipe(
    Match.discriminatorsExhaustive("$type")({
      ListType: (list) => listOf(typeOfRef(list.element)),
      ScalarType: (type) => scalar(type.name),
    }),
  );

export const fits: From<Type, From<Type, boolean>> = (expected) => (actual) => {
  if (expected.kind === "unknown" || actual.kind === "unknown") {
    return true;
  }
  if (expected.kind === "list" && actual.kind === "list") {
    return fits(expected.element)(actual.element);
  }
  return expected.kind === actual.kind;
};

export const typeName: From<Type, string> = (type) => {
  if (type.kind === "list") {
    return `[${typeName(type.element)}]`;
  }
  return type.kind;
};

export const typeOfValue: From<Value, Type> = (value) => {
  if (value.kind !== "list") {
    return scalar(value.kind);
  }
  return listOf(
    Arr.match(value.items, {
      onEmpty: () => UNKNOWN,
      onNonEmpty: (items) => typeOfValue(Arr.headNonEmpty(items)),
    }),
  );
};
