import { Effect, Function as Fn, Option, pipe } from "effect";

import type { Check, CheckContext, CheckError, CheckServices } from "./check.ts";
import type { Report } from "./report.ts";
import type { ToolSection, ToolSections } from "./types.ts";

type SectionRun<Key extends ToolSection> = (
  section: NonNullable<ToolSections[Key]>,
  context: CheckContext,
) => Effect.Effect<Report, CheckError, CheckServices>;

const DATA_FIRST_ARITY = 2;

const withSection: {
  <Key extends ToolSection>(run: SectionRun<Key>): (key: Key) => Check;
  <Key extends ToolSection>(key: Key, run: SectionRun<Key>): Check;
} = Fn.dual(
  DATA_FIRST_ARITY,
  <Key extends ToolSection>(key: Key, run: SectionRun<Key>): Check =>
    (context) =>
      pipe(
        Option.fromNullishOr(context.config[key]),
        Option.match({
          onNone: () => Effect.succeedNone,
          onSome: (section) => Effect.asSome(run(section, context)),
        }),
      ),
);

/** @internal */
export { withSection };
/** @internal */
export type { SectionRun };
