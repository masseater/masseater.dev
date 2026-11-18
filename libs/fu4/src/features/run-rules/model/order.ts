import { Array as Arr, Order } from "effect";

import type { Diagnostic } from "#/shared/config/index.ts";

const byPosition: Order.Order<Diagnostic> = Order.combineAll([
  Order.mapInput(Order.String, (found: Diagnostic) => found.path),
  Order.mapInput(Order.Number, (found: Diagnostic) => found.line),
  Order.mapInput(Order.Number, (found: Diagnostic) => found.column),
  Order.mapInput(Order.String, (found: Diagnostic) => found.message),
]);

const same = (left: Diagnostic, right: Diagnostic): boolean =>
  left.path === right.path &&
  left.line === right.line &&
  left.column === right.column &&
  left.message === right.message &&
  left.rule === right.rule;

export const ordered = (found: readonly Diagnostic[]): readonly Diagnostic[] =>
  Arr.dedupeWith(Arr.sort(found, byPosition), same);
