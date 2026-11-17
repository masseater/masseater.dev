import { runTool } from "@masseater.dev/lint-host";
import type { ToolCall } from "@masseater.dev/lint-host";
import { Array as Arr, Boolean as Bool, Effect } from "effect";

import type { Finding, GitSource, H56mConfig } from "#/shared/config/index.ts";
import { failedWith } from "#/shared/lib/errors.ts";
import type { H56mError } from "#/shared/lib/errors.ts";

import { makeDetector } from "./detector.ts";
import { format } from "./format.ts";
import { h56mSection } from "./section.ts";

const STAGED = "--staged";
const BASES = ["origin/HEAD", "origin/main", "origin/master"];
const HEAD = "HEAD";

const candidatesOf = (requested: readonly string[]): readonly string[] =>
  Arr.match(requested, { onEmpty: () => BASES, onNonEmpty: (given) => given });

const sourceOf = (requested: readonly string[]): GitSource =>
  Bool.match(Arr.contains(requested, STAGED), {
    onTrue: (): GitSource => ({ type: "staged" }),
    onFalse: (): GitSource => ({ type: "history", bases: candidatesOf(requested), head: HEAD }),
  });

const scan = ({
  root,
  config,
  args,
}: ToolCall<H56mConfig>): Effect.Effect<readonly Finding[], H56mError> =>
  makeDetector(config).pipe(
    Effect.flatMap((detector) => detector.scanGit({ root, source: sourceOf(args) })),
  );

export const runCli = (): void => {
  runTool({ name: "h56m", section: h56mSection, failWith: failedWith, scan, format });
};
