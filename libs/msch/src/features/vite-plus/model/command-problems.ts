import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";

import type { CommandKind, CommandSource } from "./command-sources.ts";
import { simpleCommands } from "./command-words.ts";
import type { CommandWords } from "./command-words.ts";

const PACKAGE_MANAGERS: readonly string[] = ["pnpm", "pnpx", "npm", "npx", "yarn", "bun", "bunx"];
const VITE_PLUS = "vp";
const RUN = "run";
const GIT = "git";
const GITHUB = "gh";
const MERGE = "merge";
const SKIP_HOOKS = "--no-verify";
const BYPASS_RULESET = "--admin";
const FILTER = /^(?:--filter(?:=.*)?|-F)$/u;
const TASK_KINDS: readonly CommandKind[] = ["script", "task"];
const SECOND = 1;

interface CommandRule {
  readonly rule: RuleName;
  readonly applies: (source: CommandSource, words: CommandWords) => boolean;
  readonly message: (command: string) => string;
}

const programOf = (words: CommandWords): string => Arr.headNonEmpty(words);

const subcommandOf = (words: CommandWords): Option.Option<string> => Arr.get(words, SECOND);

const RULES: readonly CommandRule[] = [
  {
    rule: "package-manager-command",
    applies: (_source, words) => Arr.contains(PACKAGE_MANAGERS, programOf(words)),
    message: (command) =>
      `\`${command}\` calls the package manager directly. Run it through vp (vp install, vp add, vp exec, vp dlx, vp run), so that hooks, CI and sessions all use the toolchain Vite+ pins.`,
  },
  {
    rule: "skipped-gate",
    applies: (_source, words) =>
      (programOf(words) === GIT && Arr.contains(words, SKIP_HOOKS)) ||
      (programOf(words) === GITHUB &&
        Arr.contains(words, MERGE) &&
        Arr.contains(words, BYPASS_RULESET)),
    message: (command) =>
      `\`${command}\` skips a gate: ${SKIP_HOOKS} skips the hooks that run verify, and ${BYPASS_RULESET} bypasses the ruleset. Remove the flag and fix what the gate reports.`,
  },
  {
    rule: "filter-task",
    applies: (source, words) =>
      Arr.contains(TASK_KINDS, source.kind) &&
      programOf(words) === VITE_PLUS &&
      Option.contains(subcommandOf(words), RUN) &&
      pipe(
        words,
        Arr.some((word) => FILTER.test(word)),
      ),
    message: (command) =>
      `\`${command}\` wraps one package's task in another task. Write <package>#<task> in dependsOn instead, so that Vite+ sees the dependency and caches it.`,
  },
];

const problemsOf = (source: CommandSource): readonly Problem[] =>
  pipe(
    simpleCommands(source.text),
    Arr.flatMap((words) =>
      pipe(
        RULES,
        Arr.filter(({ applies }) => applies(source, words)),
        Arr.map(({ rule, message }): Problem => ({
          file: source.file,
          ...source.position,
          rule,
          message: message(Str.trim(Arr.join(words, " "))),
        })),
      ),
    ),
  );

export const commandProblems = (sources: readonly CommandSource[]): readonly Problem[] =>
  pipe(sources, Arr.flatMap(problemsOf));
