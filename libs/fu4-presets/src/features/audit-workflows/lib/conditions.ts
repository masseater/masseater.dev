import { Option } from "effect";

import { consteval } from "#/entities/expression-tree/index.ts";
import type { If } from "#/features/audit-workflows/model/common.ts";

import { parseBare } from "./expressions.ts";

export const isStaticallyFalse = (condition: If): boolean => {
  if (condition.type === "bool") {
    return !condition.value;
  }
  return Option.exists(
    Option.flatMap(parseBare(condition.raw), (spanned) => consteval(spanned.expr)),
    (value) => value.type === "boolean" && !value.value,
  );
};

export const keepsRunning = (condition: Option.Option<If>): boolean =>
  !Option.exists(condition, isStaticallyFalse);
