import { Array as Arr, Option, String as Str, pipe } from "effect";

import { is, isOperand, next, reaches, take } from "#/features/zizmor/lib/args.ts";
import type { Taken } from "#/features/zizmor/lib/args.ts";
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
import type { Audit, AuditContext, Drafts } from "#/features/zizmor/model/audit.ts";
import type { StepView } from "#/features/zizmor/model/step.ts";

const meta = { ident: "adhoc-packages", desc: "ad-hoc installation of packages" } as const;

type Installer = (args: readonly string[]) => boolean;

const VALUE_OPTIONS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ["pnpm", new Set(["-C", "--dir", "-F", "--filter", "--filter-prod"])],
  ["yarn", new Set(["--cwd", "--mutex", "--cache-folder"])],
]);

const WRAPPERS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ["yarn", new Set(["global"])],
  ["pnpm", new Set(["recursive", "multi", "m"])],
]);

const NPM_INSTALLS = new Set([
  "install",
  "i",
  "in",
  "ins",
  "inst",
  "insta",
  "instal",
  "isnt",
  "isnta",
  "isntal",
  "isntall",
  "add",
]);

const listed =
  (table: ReadonlyMap<string, ReadonlySet<string>>, name: string) =>
  (value: string): boolean =>
    Option.exists(Option.fromNullishOr(table.get(name)), (values) => values.has(value));

const skipsValue = (name: string, option: string): boolean =>
  !Str.includes("=")(option) && listed(VALUE_OPTIONS, name)(option);

const subcommand =
  (name: string) =>
  (args: readonly string[]): Option.Option<Taken> =>
    Option.flatMap(next(args), ({ value, rest }) => {
      if (value === "--") {
        return next(rest);
      }
      if (isOperand(value)) {
        return Option.some({ value, rest });
      }
      if (!skipsValue(name, value)) {
        return subcommand(name)(rest);
      }
      return Option.flatMap(next(rest), (skipped) => subcommand(name)(skipped.rest));
    });

const scopedSubcommand =
  (name: string) =>
  (args: readonly string[]): Option.Option<Taken> =>
    Option.flatMap(subcommand(name)(args), (first) => {
      if (name === "yarn" && first.value === "workspace") {
        return Option.flatMap(next(first.rest), (scope) => subcommand(name)(scope.rest));
      }
      if (listed(WRAPPERS, name)(first.value)) {
        return subcommand(name)(first.rest);
      }
      return Option.some(first);
    });

const addsPackage =
  (name: string): Installer =>
  (args) =>
    Option.exists(
      scopedSubcommand(name)(args),
      ({ value, rest }) => value === "add" && pipe(rest, Arr.some(isOperand)),
    );

const npm: Installer = (args) =>
  Option.exists(
    take(isOperand)(args),
    ({ value, rest }) => NPM_INSTALLS.has(value) && pipe(rest, Arr.some(isOperand)),
  );

const INSTALLERS: ReadonlyMap<string, Installer> = new Map([
  ["gem", reaches(is("install", "i"), isOperand)],
  ["bundle", reaches(is("add"), isOperand)],
  ["npm", npm],
  ["yarn", addsPackage("yarn")],
  ["pnpm", addsPackage("pnpm")],
]);

export const isAdhocInstall =
  (name: string) =>
  (args: readonly string[]): boolean =>
    Option.exists(Option.fromNullishOr(INSTALLERS.get(name)), (installer) => installer(args));

export const installCommands =
  (parse: ScriptParser) =>
  (dialect: "bash" | "pwsh", run: string): readonly Command[] =>
    pipe(
      Option.toArray(treeOf(parse)(dialect, run)),
      Arr.flatMap(commandsOf(dialect)),
      Arr.filter((command) => isAdhocInstall(command.name)(command.args)),
    );

const check = (step: StepView, context: AuditContext): Drafts => {
  const { body } = step;
  if (body.type !== "run") {
    return [];
  }
  return pipe(
    Option.toArray(scriptDialectOf(step)),
    Arr.flatMap((dialect) => installCommands(context.parseScript)(dialect, body.run)),
    Arr.map((command) =>
      pipe(
        finding(meta),
        severity("low"),
        confidence("high"),
        at(hidden(step.location)),
        atPath(step.location, withKeys("run"), keyOnly, annotated("this step")),
        atPath(
          step.location,
          primary,
          withKeys("run"),
          withinAt(command.span.start)(command.span.text),
          annotated("installs a package outside of a lockfile"),
        ),
      ),
    ),
  );
};

export const adhocPackages: Audit = { ...meta, step: check, compositeStep: check };
