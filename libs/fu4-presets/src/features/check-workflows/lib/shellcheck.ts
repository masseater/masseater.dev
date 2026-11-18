import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { ExecRun, Job, Defaults } from "#/entities/workflow/index.ts";
import { CODES, messageOf } from "#/shared/shell/index.ts";
import type { Finding } from "#/shared/shell/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

const EXPRESSION = /\$\{\{[\s\S]*?\}\}/gu;
const CHECKED = new Set(["bash", "sh"]);
const encoder = new TextEncoder();

const masked = (found: string): string => Str.repeat(encoder.encode(found).length)("_");

export const sanitize = (script: string): string => {
  let out = script;
  for (const [found] of Str.matchAll(EXPRESSION)(script)) {
    out = Str.replace(found, masked(found))(out);
  }
  return out;
};

export const isChecked = (shell: string): boolean =>
  CHECKED.has(shell) || Str.startsWith("bash ")(shell) || Str.startsWith("sh ")(shell);

export const defaultShell = (defaults: Defaults | undefined): Option.Option<Text> =>
  pipe(
    Option.fromNullishOr(defaults),
    Option.flatMap((found) => Option.fromNullishOr(found.run)),
    Option.flatMap((run) => Option.fromNullishOr(run.shell)),
  );

export const shellOf = (defaults: Defaults | undefined): Option.Option<string> =>
  Option.map(defaultShell(defaults), (shell) => shell.value);

const isWindows = (label: string): boolean => {
  const lower = Str.toLowerCase(label);
  return lower === "windows" || Str.startsWith("windows-")(lower);
};

export const runnerShell = (job: Job): Option.Option<string> => {
  const windows = pipe(
    Option.fromNullishOr(job.runsOn),
    Option.exists((runner) =>
      pipe(
        runner.labels,
        Arr.some((label) => isWindows(label.value)),
      ),
    ),
  );
  return pipe(
    Option.some("pwsh"),
    Option.filter(() => windows),
  );
};

export interface Shells {
  workflow: Option.Option<string>;
  job: Option.Option<string>;
  runner: Option.Option<string>;
}

export const stepShell =
  (shells: Readonly<Shells>) =>
  (run: ExecRun): string =>
    pipe(
      Option.fromNullishOr(run.shell),
      Option.map((found) => found.value),
      Option.orElse(() => shells.job),
      Option.orElse(() => shells.workflow),
      Option.orElse(() => shells.runner),
      Option.getOrElse(() => "bash"),
    );

export const shown = (finding: Finding): string => {
  const code = CODES[finding.code];
  return `shellcheck reported issue in this script: SC${String(code.number)}:${code.level}:${String(finding.line)}:${String(finding.column)}: ${messageOf(finding)}`;
};
