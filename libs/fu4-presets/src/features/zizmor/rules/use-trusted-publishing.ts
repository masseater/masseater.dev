import { Array as Arr, Option, String as Str, pipe } from "effect";

import {
  is,
  isNot,
  passes,
  reaches,
  startsWith,
  take,
  thenEvery,
} from "#/features/zizmor/lib/args.ts";
import type { Predicate, Taken } from "#/features/zizmor/lib/args.ts";
import { all, configurable, field, not, usageOf } from "#/features/zizmor/lib/coordinate.ts";
import { at, atPath, confidence, finding, severity } from "#/features/zizmor/lib/finding.ts";
import {
  annotated,
  hidden,
  keyOnly,
  primary,
  withinAt,
  withKeys,
} from "#/features/zizmor/lib/location.ts";
import { commandsOf, scriptDialectOf, treeOf } from "#/features/zizmor/lib/script.ts";
import type { Command, ScriptParser } from "#/features/zizmor/lib/script.ts";
import { hasIdToken } from "#/features/zizmor/lib/workflow.ts";
import type { Audit, AuditContext, Drafts } from "#/features/zizmor/model/audit.ts";
import type { Coordinate } from "#/features/zizmor/model/coordinate.ts";
import type { StepView } from "#/features/zizmor/model/step.ts";

const meta = {
  ident: "use-trusted-publishing",
  desc: "prefer trusted publishing for authentication",
} as const;

const USES_MANUAL_CREDENTIAL =
  "uses a manually-configured credential instead of Trusted Publishing";

const PYTHON_INDICES = ["https://upload.pypi.org/legacy/", "https://test.pypi.org/legacy/"];
const RUBY_INDICES = ["https://rubygems.org"];
const NPM_INDICES = ["https://registry.npmjs.org", "https://registry.npmjs.org/"];

const FREE = { type: "free-string" } as const;
const BOOLEAN = { type: "boolean" } as const;
const exact = (items: readonly string[]) => ({ type: "exact", items }) as const;

const optIn = field("opt-in");

const PYPI_PASSWORD = optIn("password")(FREE)(false);
const PYPI_INDEX = all(
  optIn("repository-url")(exact(PYTHON_INDICES))(true),
  optIn("repository_url")(exact(PYTHON_INDICES))(true),
);
const RUBY_TRUSTED = optIn("setup-trusted-publisher")(BOOLEAN)(true);
const RUBY_TOKEN = optIn("api-token")(FREE)(false);
const RUBY_SERVER = optIn("gem-server")(exact(RUBY_INDICES))(true);
const NPM_REGISTRY = optIn("registry-url")(exact(NPM_INDICES))(true);
const NPM_AUTH = optIn("always-auth")(BOOLEAN)(false);

const ACTIONS: readonly (readonly [Coordinate, readonly string[]])[] = [
  [
    configurable("pypa/gh-action-pypi-publish")(all(PYPI_PASSWORD, PYPI_INDEX)),
    ["with", "password"],
  ],
  [configurable("rubygems/release-gem")(not(RUBY_TRUSTED)), ["with", "setup-trusted-publisher"]],
  [
    configurable("rubygems/configure-rubygems-credentials")(all(RUBY_TOKEN, RUBY_SERVER)),
    ["with", "api-token"],
  ],
  [configurable("actions/setup-node")(all(NPM_REGISTRY, NPM_AUTH)), ["with", "always-auth"]],
];

type Publisher = (args: readonly string[]) => boolean;

const DRY_RUN = isNot("--dry-run");

const withoutDryRun =
  (...predicates: readonly Predicate[]): Publisher =>
  (args) =>
    pipe(Option.some(args), passes(...predicates), thenEvery(DRY_RUN));

const firstOf =
  (...values: readonly string[]) =>
  (args: readonly string[]): Option.Option<Taken> =>
    take(is(...values))(args);

const uv: Publisher = (args) =>
  Option.exists(firstOf("publish", "run")(args), ({ value, rest }) => {
    if (value === "publish") {
      return pipe(rest, Arr.every(DRY_RUN));
    }
    return reaches(is("twine"), is("upload"))(rest);
  });

const yarn: Publisher = (args) =>
  Option.exists(firstOf("publish", "npm")(args), ({ value, rest }) => {
    if (value === "publish") {
      return true;
    }
    return pipe(Option.some(rest), passes(is("publish")), thenEvery(isNot("--dry-run", "-n")));
  });

const isNpm: Predicate = (arg) => arg === "npm" || Str.startsWith("npm@")(arg);

const bunx: Publisher = (args) =>
  Option.exists(take(isNpm)(args), ({ rest }) => withoutDryRun(is("publish"))(rest));

const PUBLISHERS: ReadonlyMap<string, Publisher> = new Map([
  [
    "cargo",
    (args: readonly string[]) =>
      pipe(Option.some(args), passes(is("publish")), thenEvery(isNot("--dry-run", "-n"))),
  ],
  ["uv", uv],
  ["uvx", reaches(startsWith("twine"), is("upload"))],
  ["hatch", reaches(is("publish"))],
  ["pdm", reaches(is("publish"))],
  ["poetry", withoutDryRun(is("publish"))],
  ["twine", reaches(is("upload"))],
  ["pipx", reaches(is("run"), startsWith("twine"), is("upload"))],
  ["gem", reaches(is("push"))],
  ["bundle", reaches(is("exec"), is("gem"), is("push"))],
  ["npm", withoutDryRun(is("publish"))],
  ["yarn", yarn],
  ["pnpm", withoutDryRun(is("publish"))],
  ["bunx", bunx],
  ["bun", withoutDryRun(is("publish"))],
  ["nuget", reaches(is("push"))],
  ["nuget.exe", reaches(is("push"))],
  ["dotnet", reaches(is("nuget"), is("push"))],
]);

const pythonPublishes = reaches(is("-m"), is("twine"), is("upload"));

export const isPublishCommand =
  (name: string) =>
  (args: readonly string[]): boolean =>
    Option.match(Option.fromNullishOr(PUBLISHERS.get(name)), {
      onSome: (publisher) => publisher(args),
      onNone: () => Str.startsWith("python")(name) && pythonPublishes(args),
    });

export const publishCommands =
  (parse: ScriptParser) =>
  (dialect: "bash" | "pwsh", run: string): readonly Command[] =>
    pipe(
      Option.toArray(treeOf(parse)(dialect, run)),
      Arr.flatMap(commandsOf(dialect)),
      Arr.filter((command) => isPublishCommand(command.name)(command.args)),
    );

const actionFindings = (step: StepView): Drafts =>
  pipe(
    ACTIONS,
    Arr.flatMap(([coordinate, keys]) => {
      if (Option.isNone(usageOf(coordinate)(step))) {
        return [];
      }
      return [
        pipe(
          finding(meta),
          severity("informational"),
          confidence("high"),
          at(hidden(step.location)),
          atPath(step.location, primary, withKeys("uses"), annotated("this step")),
          atPath(step.location, primary, withKeys(...keys), annotated(USES_MANUAL_CREDENTIAL)),
        ),
      ];
    }),
  );

const commandFindings = (step: StepView, run: string, context: AuditContext): Drafts =>
  pipe(
    Option.toArray(scriptDialectOf(step)),
    Arr.flatMap((dialect) => publishCommands(context.parseScript)(dialect, run)),
    Arr.map((command) =>
      pipe(
        finding(meta),
        severity("informational"),
        confidence("high"),
        at(hidden(step.location)),
        atPath(step.location, withKeys("run"), keyOnly, annotated("this step")),
        atPath(
          step.location,
          primary,
          withKeys("run"),
          withinAt(command.span.start)(command.span.text),
          annotated("this command"),
        ),
      ),
    ),
  );

export const useTrustedPublishing: Audit = {
  ...meta,
  step: (step, context) => {
    const { body } = step;
    if (body.type !== "run" || Option.exists(step.job, hasIdToken)) {
      return actionFindings(step);
    }
    return [...actionFindings(step), ...commandFindings(step, body.run, context)];
  },
  compositeStep: actionFindings,
};
