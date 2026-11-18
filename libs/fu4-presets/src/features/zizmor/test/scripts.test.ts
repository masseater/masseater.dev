import { NodeServices } from "@effect/platform-node";
import { defineRule, lintText } from "@r_masseater/fu4";
import type { RuleContext } from "@r_masseater/fu4";
import { Array as Arr, Effect, ManagedRuntime, Option, Result, Schema, pipe } from "effect";
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test";

import type { Dialect, ScriptParser } from "#/features/zizmor/lib/script.ts";
import { installCommands, isAdhocInstall } from "#/features/zizmor/rules/adhoc-packages.ts";
import { environmentWrites } from "#/features/zizmor/rules/github-env.ts";
import {
  isPublishCommand,
  publishCommands,
} from "#/features/zizmor/rules/use-trusted-publishing.ts";

import RAW_CASES from "./scripts.cases.json" with { type: "json" };

const services = ManagedRuntime.make(NodeServices.layer);
afterAll(() => services.dispose());

const parsers: ScriptParser[] = [];

const capture = defineRule({
  meta: { description: "Captures the script parser" },
  check: (context: RuleContext) => {
    parsers.push(context.parseScript);
  },
});

beforeAll(() =>
  lintText({
    root: ".",
    path: "capture.yml",
    kind: "workflow",
    text: "",
    config: { plugins: { capture: { rules: { capture } } }, rules: { "capture/capture": "error" } },
  }).pipe(Effect.asVoid, services.runPromise),
);

const ScriptCases = Schema.Array(Schema.Tuple([Schema.String, Schema.Boolean]));
const ArgsCases = Schema.Array(Schema.Tuple([Schema.Array(Schema.String), Schema.Boolean]));
const Cases = Schema.Struct({
  BASH_WRITES: ScriptCases,
  CMD_WRITES: Schema.Array(Schema.String),
  PWSH_WRITES: ScriptCases,
  PUBLISH_COMMANDS: ArgsCases,
  PWSH_PUBLISHES: ScriptCases,
  INSTALL_COMMANDS: ArgsCases,
  PWSH_INSTALLS: ScriptCases,
});

const {
  BASH_WRITES,
  CMD_WRITES,
  PWSH_WRITES,
  PUBLISH_COMMANDS,
  PWSH_PUBLISHES,
  INSTALL_COMMANDS,
  PWSH_INSTALLS,
} = Result.getOrThrow(Schema.decodeUnknownResult(Cases)(RAW_CASES));

const parser = (): ScriptParser => Option.getOrThrow(Arr.head(parsers));

const writes =
  (dialect: Dialect) =>
  (script: string): boolean =>
    Arr.isReadonlyArrayNonEmpty(environmentWrites(parser())(dialect, script));

const expectedSpans = (line: string, expected: boolean): readonly string[] => {
  if (expected) {
    return [line];
  }
  return [];
};

describe("github-env", () => {
  test.each(BASH_WRITES)("bash %j", (script, expected) => {
    expect(writes("bash")(script)).toBe(expected);
  });

  test.each(CMD_WRITES)("cmd %j", (script) => {
    expect(writes("cmd")(script)).toBe(true);
  });

  test.each(PWSH_WRITES)("pwsh %j", (script, expected) => {
    expect(writes("pwsh")(script)).toBe(expected);
  });
});

const wrapped = (line: string): string => `Write-Host '🦀'\n${line}\nWrite-Host done`;

const spans = (
  commands: readonly { readonly span: { readonly text: string } }[],
): readonly string[] =>
  pipe(
    commands,
    Arr.map((command) => command.span.text),
  );

const pwshSpans =
  (find: typeof publishCommands) =>
  (line: string): readonly string[] =>
    spans(find(parser())("pwsh", wrapped(line)));

describe("use-trusted-publishing", () => {
  test.each(PUBLISH_COMMANDS)("%j", ([name = "", ...args], expected) => {
    expect(isPublishCommand(name)(args)).toBe(expected);
  });

  test.each(PWSH_PUBLISHES)("pwsh %j", (line, expected) => {
    expect(pwshSpans(publishCommands)(line)).toStrictEqual(expectedSpans(line, expected));
  });
});

describe("adhoc-packages", () => {
  test.each(INSTALL_COMMANDS)("%j", ([name = "", ...args], expected) => {
    expect(isAdhocInstall(name)(args)).toBe(expected);
  });

  test.each(PWSH_INSTALLS)("pwsh %j", (line, expected) => {
    expect(pwshSpans(installCommands)(line)).toStrictEqual(expectedSpans(line, expected));
  });
});
