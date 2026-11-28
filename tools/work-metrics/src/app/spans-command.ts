import { Command } from "effect/cli";

import { dirsFlag, outFlag, topFlag } from "./flags.ts";
import { reportSpans } from "./span-report.ts";

/** @internal */
export const spansCommand = Command.make(
  "spans",
  { dir: dirsFlag, out: outFlag, top: topFlag },
  ({ dir, out, top }) => reportSpans({ dir, out, top, title: "Time per span" }),
);
