import { fileURLToPath } from "node:url";

import { Array as Arr, Effect, Schema, Stream, pipe } from "effect";
import { ChildProcess } from "effect/process";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const RULE: RuleName = "legacy-web";
const FIRST_COLUMN = 1;
const SCANNER = fileURLToPath(
  new URL(
    "./skills/modern-web-guidance/modern-web.mjs",
    import.meta.resolve("modern-web-guidance/package.json"),
  ),
);

const Finding = Schema.Struct({ file: Schema.String, line: Schema.Int, message: Schema.String });

const Rule = Schema.Struct({ ruleId: Schema.String, findings: Schema.Array(Finding) });

const Guide = Schema.Struct({ guideId: Schema.String, rules: Schema.Array(Rule) });

const Scan = Schema.fromJsonString(Schema.Struct({ guides: Schema.Array(Guide) }));

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
  const scan = yield* Schema.decodeEffect(Scan)(output).pipe(Effect.orDie);
  const problemOf =
    (guideId: string, ruleId: string) =>
    ({ file, line, message }: typeof Finding.Type): Problem => ({
      file: files.join(root, file),
      line,
      column: FIRST_COLUMN,
      rule: RULE,
      message: `${ruleId}: ${message} Read the guide with \`modern-web-guidance retrieve ${guideId}\` and apply it.`,
    });
  return pipe(
    scan.guides,
    Arr.flatMap(({ guideId, rules }) =>
      pipe(
        rules,
        Arr.flatMap(({ ruleId, findings }) => pipe(findings, Arr.map(problemOf(guideId, ruleId)))),
      ),
    ),
  );
});
