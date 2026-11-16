import { Array as Arr, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";

import type { CommandSource } from "./command-sources.ts";

const RULE: RuleName = "package-script";
const LIFECYCLE: readonly string[] = [
  "preinstall",
  "install",
  "postinstall",
  "preprepare",
  "prepare",
  "postprepare",
  "prepublish",
  "prepublishOnly",
  "prepack",
  "postpack",
  "publish",
  "postpublish",
  "preversion",
  "version",
  "postversion",
  "dependencies",
  "pnpm:devPreinstall",
];

const problemOf = ({ file, position, name }: CommandSource): Problem => ({
  file,
  ...position,
  rule: RULE,
  message: `The script ${name} is not a lifecycle script. package.json scripts hold only the scripts the package manager runs by itself, such as prepare and prepack. Write ${name} as a task in run.tasks of this package's vite.config.ts, where its shape is type-checked.`,
});

export const packageScriptProblems = (sources: readonly CommandSource[]): readonly Problem[] =>
  pipe(
    sources,
    Arr.filter(({ kind, name }) => kind === "script" && !Arr.contains(LIFECYCLE, name)),
    Arr.map(problemOf),
  );
