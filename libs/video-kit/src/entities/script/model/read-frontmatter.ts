import { Array as Arr, Effect, Option, pipe } from "effect";
import type { Nodes, Yaml } from "mdast";
import { parse as parseYaml } from "yaml";

import { ONE } from "#/shared/config/index.ts";

import type { Frontmatter } from "./frontmatter.ts";
import { decodeFrontmatter, lengthOf } from "./frontmatter.ts";
import { ScriptError } from "./script-error.ts";
import type { Script } from "./script.ts";

const MISSING = "先頭に `---` で囲んだ設定がない";

const isYaml = (node: Nodes): node is Yaml => node.type === "yaml";

const yamlOf = (nodes: readonly Nodes[]): Effect.Effect<string, ScriptError> =>
  pipe(
    nodes,
    Arr.findFirst(isYaml),
    Option.match({
      onNone: () => Effect.fail(ScriptError.make({ line: ONE, message: MISSING })),
      onSome: ({ value }) => Effect.succeed(value),
    }),
  );

const parsed = (yaml: string): Effect.Effect<unknown, ScriptError> =>
  Effect.try({
    try: (): unknown => parseYaml(yaml),
    catch: (failure) =>
      ScriptError.make({ line: ONE, message: `設定の YAML が読めない: ${String(failure)}` }),
  });

export const readFrontmatter = (nodes: readonly Nodes[]): Effect.Effect<Frontmatter, ScriptError> =>
  yamlOf(nodes).pipe(
    Effect.flatMap(parsed),
    Effect.flatMap((raw) =>
      decodeFrontmatter(raw).pipe(
        Effect.mapError((failure) =>
          ScriptError.make({ line: ONE, message: `設定が正しくない: ${failure.message}` }),
        ),
      ),
    ),
  );

const voiceOf = (frontmatter: Frontmatter): Pick<Script, "voice"> => {
  if (frontmatter.voice === "none") {
    return {};
  }
  return { voice: frontmatter.voice };
};

const bgmOf = (frontmatter: Frontmatter): Pick<Script, "bgm"> => {
  if ("bgm" in frontmatter) {
    return { bgm: frontmatter.bgm };
  }
  return {};
};

export const settingsOf = (frontmatter: Frontmatter): Omit<Script, "scenes"> => ({
  title: frontmatter.title,
  formats: frontmatter.formats,
  length: lengthOf(frontmatter),
  readings: frontmatter.readings,
  ...voiceOf(frontmatter),
  ...bgmOf(frontmatter),
});
