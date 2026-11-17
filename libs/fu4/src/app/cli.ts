import { runCli as runLinter } from "@masseater.dev/lint-host";

import { failedWith } from "#/shared/lib/errors.ts";

import { format, lint } from "./index.ts";
import { fu4Section, workflowPathspecs } from "./section.ts";

export const runCli = (): void => {
  runLinter({
    name: "fu4",
    section: fu4Section,
    pathspecs: workflowPathspecs,
    lint,
    format,
    failWith: failedWith,
  });
};
