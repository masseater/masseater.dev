import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { Array as Arr, Effect, FileSystem, Path, Schema, String as Str, pipe } from "effect";
import { expect } from "vite-plus/test";
import { parse } from "yaml";

const Step = Schema.Struct({
  name: Schema.optional(Schema.String),
  uses: Schema.optional(Schema.String),
});

const Job = Schema.Struct({ steps: Schema.Array(Step) });

const Workflow = Schema.Struct({
  jobs: Schema.Struct({
    "mosaic-plan": Job,
    "mosaic-character": Job,
    "mosaic-deploy": Job,
    "mosaic-refresh": Job,
  }),
});

const namesOf = (job: typeof Job.Type): readonly string[] =>
  pipe(
    job.steps,
    Arr.flatMap((step) => Arr.fromNullishOr(step.name)),
  );

const usesLatestVerified = Str.includes("latest-verified");

const workflowMatchesTheScripts = Effect.gen(function* workflowMatchesTheScripts() {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const file = path.resolve(import.meta.dirname, "../../../.github/workflows/verify.yml");
  const source = yield* fs.readFileString(file);
  const { jobs } = yield* Schema.decodeUnknownEffect(Workflow)(parse(source));
  expect(namesOf(jobs["mosaic-plan"])).toStrictEqual(["rebuild", "web"]);
  expect(namesOf(jobs["mosaic-deploy"])).toStrictEqual(["deploy"]);
  expect(namesOf(jobs["mosaic-refresh"])).toStrictEqual(["deploy"]);
  const actions = pipe(
    [jobs["mosaic-plan"], jobs["mosaic-character"], jobs["mosaic-deploy"], jobs["mosaic-refresh"]],
    Arr.flatMap((job) => job.steps),
    Arr.flatMap((step) => Arr.fromNullishOr(step.uses)),
  );
  expect(pipe(actions, Arr.filter(usesLatestVerified))).toStrictEqual([]);
});

layer(nodeServicesLayer)("verify.yml の mosaic のジョブ", (it) => {
  it.effect(
    "スクリプトが探す名前のステップを持ち、latest-verified を使わない",
    () => workflowMatchesTheScripts,
  );
});
