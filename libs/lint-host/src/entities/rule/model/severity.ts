import { Match } from "effect";

import type { Setting, Severity } from "./setting.ts";

export const reportedSeverity = (setting: Setting): Exclude<Severity, "off"> =>
  Match.value(setting.severity).pipe(
    Match.when("warn", (): Exclude<Severity, "off"> => "warn"),
    Match.orElse((): Exclude<Severity, "off"> => "error"),
  );
