import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { listedFiles, presentFiles } from "#/shared/lib/scanned-files.ts";
import type { Listed } from "#/shared/lib/scanned-files.ts";

const RULE: RuleName = "replaced-tool";
const FIRST = 1;
const TASKS = "Vite+ tasks in run.tasks of vite.config.ts, run with `vp run`";
const HOOKS = "the hooks in .vite-hooks/ that `vp config` installs";
const ALCHEMY = "the Alchemy stack in alchemy.run.ts";

interface ReplacedTool {
  readonly pattern: RegExp;
  readonly tool: string;
  readonly replacement: string;
}

const REPLACED: readonly ReplacedTool[] = [
  { pattern: /(?:^|\/)turbo\.jsonc?$/u, tool: "Turborepo", replacement: TASKS },
  { pattern: /(?:^|\/)nx\.json$/u, tool: "Nx", replacement: TASKS },
  { pattern: /(?:^|\/)\.husky\//u, tool: "husky", replacement: HOOKS },
  {
    pattern: /(?:^|\/)(?:\.?lefthook(?:-local)?\.(?:ya?ml|toml|json)|\.lefthook\/)/u,
    tool: "lefthook",
    replacement: HOOKS,
  },
  {
    pattern: /(?:^|\/)\.?knip\.(?:jsonc?|[cm]?[jt]s)$/u,
    tool: "knip",
    replacement: "fallow",
  },
  { pattern: /(?:^|\/)\.jscpd\.json$/u, tool: "jscpd", replacement: "fallow" },
  {
    pattern: /(?:^|\/)(?:\.eslintrc(?:\.\w+)?|\.eslintignore|eslint\.config\.[cm]?[jt]s)$/u,
    tool: "ESLint",
    replacement: "`lint` in vite.config.ts, run with `vp check`",
  },
  {
    pattern: /(?:^|\/)(?:\.prettierrc(?:\.\w+)?|\.prettierignore|prettier\.config\.[cm]?[jt]s)$/u,
    tool: "Prettier",
    replacement: "`fmt` in vite.config.ts, run with `vp check`",
  },
  {
    pattern: /(?:^|\/)jest\.config\.(?:json|[cm]?[jt]s)$/u,
    tool: "Jest",
    replacement: "`test` in vite.config.ts, run with `vp test`",
  },
  { pattern: /(?:^|\/)wrangler\.(?:toml|jsonc?)$/u, tool: "wrangler", replacement: ALCHEMY },
  { pattern: /(?:^|\/)Pulumi(?:\.[\w-]+)?\.ya?ml$/u, tool: "Pulumi", replacement: ALCHEMY },
  { pattern: /\.tf(?:vars)?$/u, tool: "Terraform", replacement: ALCHEMY },
  {
    pattern: /(?:^|\/)\.claude\/rules\//u,
    tool: ".claude/rules",
    replacement: "the root AGENTS.md and the skills in masseater/skills",
  },
];

const problemFor = ({ name, file }: Listed): Option.Option<Problem> =>
  pipe(
    REPLACED,
    Arr.findFirst(({ pattern }) => pattern.test(name)),
    Option.map(({ tool, replacement }) => ({
      file,
      line: FIRST,
      column: FIRST,
      rule: RULE,
      message: `belongs to ${tool}, which this repository replaced with ${replacement}. Move what is still needed there and delete this file.`,
    })),
  );

/** @internal */
export const checkReplacedTools = Effect.fn("checkReplacedTools")(function* checkReplacedTools(
  root: string,
) {
  const listed = yield* listedFiles(root);
  const present = yield* presentFiles(
    pipe(
      listed,
      Arr.filter((entry) => Option.isSome(problemFor(entry))),
    ),
  );
  return pipe(
    present,
    Arr.flatMap((entry) => Option.toArray(problemFor(entry))),
  );
});
