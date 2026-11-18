import { Array as Arr, Option, pipe } from "effect";

import type { EventFilter } from "#/entities/workflow/index.ts";
import type { Fail } from "#/features/check-workflows/lib/workflow-rule.ts";
import { quote } from "#/shared/text/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

export interface Exclusive {
  readonly filter: EventFilter | undefined;
  readonly ignore: EventFilter | undefined;
  readonly available: readonly string[];
}

const SINGLE = 1;
const NOUN: Readonly<Record<string, string>> = { true: "event", false: "events" };

const isBefore = (left: Text, right: Text): boolean =>
  left.line < right.line || (left.line === right.line && left.column < right.column);

const laterOf = (left: Text, right: Text): Text => {
  if (isBefore(left, right)) {
    return right;
  }
  return left;
};

const filled = (filter: EventFilter | undefined): Option.Option<EventFilter> =>
  Option.filter(Option.fromNullishOr(filter), (found) => Arr.isReadonlyArrayNonEmpty(found.values));

const checkBoth = (fail: Fail, exclusive: Exclusive, hook: string): void => {
  const both = Option.all([filled(exclusive.filter), filled(exclusive.ignore)]);
  for (const [filter, ignore] of Option.toArray(both)) {
    fail(
      laterOf(filter.name, ignore.name),
      `both ${quote(filter.name.value)} and ${quote(ignore.name.value)} filters cannot be used for the same event ${quote(hook)}. note: use '!' to negate patterns`,
    );
  }
};

export const checkExclusive =
  ({ fail, hook }: { readonly fail: Fail; readonly hook: string }) =>
  (exclusive: Exclusive): void => {
    if (Arr.contains(exclusive.available, hook)) {
      checkBoth(fail, exclusive, hook);
      return;
    }
    const noun = NOUN[String(exclusive.available.length <= SINGLE)];
    const used = pipe(
      [exclusive.filter, exclusive.ignore],
      Arr.flatMap((filter) => Option.toArray(filled(filter))),
    );
    for (const item of used) {
      fail(
        item.name,
        `${quote(item.name.value)} filter is not available for ${hook} event. it is only for ${Arr.join(exclusive.available, ", ")} ${noun}`,
      );
    }
  };
