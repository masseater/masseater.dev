import { runCli as runLinter } from "@r_masseater/lint-host";

import { failedWith } from "#/shared/lib/errors.ts";

import { format, lint } from "./index.ts";
import { wismPathspecs, wismSection } from "./section.ts";

export const runCli = (): void => {
  runLinter({
    name: "wism",
    section: wismSection,
    pathspecs: wismPathspecs,
    lint,
    format,
    failWith: failedWith,
  });
};
