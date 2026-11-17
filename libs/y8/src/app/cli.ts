import { runCli as runLinter } from "@masseater.dev/lint-host";

import { failedWith } from "#/shared/lib/errors.ts";

import { format, lint } from "./index.ts";
import { markdownPathspecs, y8Section } from "./section.ts";

export const runCli = (): void => {
  runLinter({
    name: "y8",
    section: y8Section,
    pathspecs: markdownPathspecs,
    lint,
    format,
    failWith: failedWith,
  });
};
