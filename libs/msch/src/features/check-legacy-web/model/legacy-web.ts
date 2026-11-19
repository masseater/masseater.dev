import { fileURLToPath } from "node:url";

import { Array as Arr, Effect, Schema, Stream } from "effect";
import { ChildProcess } from "effect/process";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const RULE: RuleName = "legacy-web";
const FIRST_COLUMN = 1;
const SCANNER = fileURLToPath(
  new URL(
    "skills/modern-web-guidance/modern-web.mjs",
    import.meta.resolve("modern-web-guidance/package.json"),
  ),
);

const Scan = Schema.fromJsonString(
  Schema.Struct({
    guides: Schema.Array(
      Schema.Struct({
        guideId: Schema.String,
        rules: Schema.Array(
          Schema.Struct({
            ruleId: Schema.String,
            findings: Schema.Array(
              Schema.Struct({ file: Schema.String, line: Schema.Int, message: Schema.String }),
            ),
          }),
        ),
      }),
    ),
  }),
);

const scanOutput = Effect.fn("scanOutput")(function* scanOutput(root: string) {
  const handle = yield* ChildProcess.make("node", [SCANNER, "legacy-scan", ".", "--json"], {
    cwd: root,
    extendEnv: true,
    env: { DISABLE_TELEMETRY: "1" },
    stdin: "ignore",
  });
  return yield* handle.stdout.pipe(Stream.decodeText(), Stream.mkString);
}, Effect.scoped);

/** @internal */
export const checkLegacyWeb = Effect.fn("checkLegacyWeb")(function* checkLegacyWeb(root: string) {
  const files = yield* RepositoryFiles;
  const output = yield* scanOutput(root).pipe(Effect.orDie);
  const scan = yield* Schema.decodeUnknownEffect(Scan)(output).pipe(Effect.orDie);
  return Arr.flatMap(scan.guides, ({ guideId, rules }) =>
    Arr.flatMap(rules, ({ ruleId, findings }) =>
      Arr.map(findings, ({ file, line, message }): Problem => ({
        file: files.join(root, file),
        line,
        column: FIRST_COLUMN,
        rule: RULE,
        message: `${ruleId}: ${message} Read the guide with \`modern-web-guidance retrieve ${guideId}\` and apply it.`,
      })),
    ),
  );
});
