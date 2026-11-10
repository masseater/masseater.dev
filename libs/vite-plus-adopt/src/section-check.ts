import { Effect, Option, pipe } from "effect";

import type { Check, CheckContext, CheckError, CheckServices } from "./check.ts";
import type { Report } from "./report.ts";
import type { ToolSection, ToolSections } from "./types.ts";

const withSection =
  <Key extends ToolSection>(
    key: Key,
    run: (
      section: NonNullable<ToolSections[Key]>,
      context: CheckContext,
    ) => Effect.Effect<Report, CheckError, CheckServices>,
  ): Check =>
  (context) =>
    pipe(
      Option.fromNullishOr(context.config[key]),
      Option.match({
        onNone: () => Effect.succeedNone,
        onSome: (section) => run(section, context).pipe(Effect.map(Option.some)),
      }),
    );

export { withSection };
