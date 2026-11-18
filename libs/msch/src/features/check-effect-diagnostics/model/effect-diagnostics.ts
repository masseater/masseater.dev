import { Array as Arr, Effect, Option, Schema, String as Str, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { scanText } from "#/shared/lib/scanned-files.ts";
import type { Listed } from "#/shared/lib/scanned-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "effect-diagnostics-once";
const PLUGIN = "@effect/language-service";
const CONFIG_PATHSPEC = ":(glob)**/tsconfig*.json";
const EXCLUDED: readonly string[] = [
  ":(exclude,attr:linguist-vendored)",
  ":(exclude,attr:linguist-generated)",
];
const START = 0;

const Plugin = Schema.Struct({
  name: Schema.optional(Schema.String),
  diagnostics: Schema.optional(Schema.Unknown),
});
const Config = Schema.Struct({
  compilerOptions: Schema.optional(
    Schema.Struct({ plugins: Schema.optional(Schema.Array(Plugin)) }),
  ),
});
const decodeConfig = Schema.decodeUnknownOption(Schema.fromJsonString(Config));

const MESSAGE = `The \`${PLUGIN}\` plugin reports the Effect diagnostics during the type check, and the \`effecttsgo\` lint rules that msch enables report the same ones again. Set \`"diagnostics": false\` on the plugin so that each finding is reported once, by the lint rules, with the severity msch sets.`;

const reportsDiagnostics = (plugin: typeof Plugin.Type): boolean =>
  plugin.name === PLUGIN && plugin.diagnostics !== false;

const problemsIn = (entry: Listed, source: string): readonly Problem[] =>
  pipe(
    decodeConfig(source),
    Option.flatMap(({ compilerOptions }) => Option.fromUndefinedOr(compilerOptions?.plugins)),
    Option.filter(Arr.some(reportsDiagnostics)),
    Option.map((): Problem => ({
      file: entry.file,
      ...positionOf(source)(
        pipe(
          Str.indexOf(`"${PLUGIN}"`)(source),
          Option.getOrElse(() => START),
        ),
      ),
      rule: RULE,
      message: MESSAGE,
    })),
    Option.toArray,
  );

/** @internal */
export const checkEffectDiagnostics = Effect.fn("checkEffectDiagnostics")(
  function* checkEffectDiagnostics(root: string) {
    const files = yield* RepositoryFiles;
    const configs = yield* files.matchingFiles(root, [CONFIG_PATHSPEC, ...EXCLUDED]);
    return yield* scanText(
      pipe(
        configs,
        Arr.map((name): Listed => ({ name, file: files.join(root, name) })),
      ),
      problemsIn,
    );
  },
);
