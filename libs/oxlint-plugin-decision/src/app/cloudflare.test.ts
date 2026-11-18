import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { assertInclude, deepStrictEqual, strictEqual } from "@effect/vitest/utils";
import { Array as Arr, Effect, FileSystem, Layer, Option, Path, Record as Rec, pipe } from "effect";

import type { DecisionRule } from "#/entities/decision/index.ts";
import { toJson } from "#/entities/decision/index.ts";

import {
  FAILED,
  PASSED,
  TIMEOUT,
  callRule,
  lintProject,
  outputOf,
} from "./fixtures.test.support.ts";
import { MockCloudflareLayer, cloudflareEnv, loggedRuns } from "./mock-cloudflare.test.support.ts";
import type { LoggedRun, MockCloudflare } from "./mock-cloudflare.test.support.ts";
import { decisionLines, projectFilesFor, runOxlint, writeProject } from "./oxlint.test.support.ts";
import type { OxlintRun, Services, TestError } from "./oxlint.test.support.ts";

type CloudflareTest<Value = void> = Effect.Effect<Value, TestError, Services | MockCloudflare>;

const MODEL = "@cf/cloudflare/clef-flash";
const SOURCE = "console.log(user.email, user.phone);\n";
const YES_LINE = `log.js:1:1: [any-call] cloudflare/${MODEL} answered yes (0.95 >= 0.80): Does this call write personal data to a log? [Error/decision(any-call)]`;
const RETRIED = 2;
const TWO_CALLS = "console.log(user.email);\nconsole.log(user.phone);\n";
const BOTH = 2;

const withCloudflare = <Value>(
  effect: Effect.Effect<Value, TestError, MockCloudflare | Services>,
): Effect.Effect<Value, TestError, Services> =>
  Effect.scoped(
    Effect.flatMap(Layer.build(MockCloudflareLayer), (context) =>
      Effect.provideContext(effect, context),
    ),
  );

const lintWith = (
  token: string,
  extraEnv: Readonly<Record<string, string>> = {},
): CloudflareTest<OxlintRun> =>
  Effect.gen(function* lint() {
    const env = yield* cloudflareEnv(token);
    return yield* lintProject({
      files: { "log.js": SOURCE },
      options: { model: `cloudflare/${MODEL}`, rules: [callRule] },
      env: { ...env, ...extraEnv },
    });
  });

const reportsYes = Effect.gen(function* test() {
  const run = yield* lintWith("yes");
  strictEqual(run.status, FAILED, outputOf(run));
  deepStrictEqual(decisionLines(run), [YES_LINE]);
});

const summaryOf = ({ url, authorization, gateway, body }: LoggedRun): object => ({
  url,
  authorization,
  gateway,
  model: body.model,
  types: pipe(
    Rec.values(body.questions),
    Arr.map(({ type }) => type),
  ),
});

const sendsTheGatewayRequest = Effect.gen(function* test() {
  yield* lintWith("yes");
  const runs = yield* loggedRuns;
  deepStrictEqual(
    pipe(Arr.head(runs), Option.map(summaryOf)),
    Option.some({
      url: `/client/v4/accounts/account-id/ai/run/${MODEL}`,
      authorization: "Bearer yes",
      gateway: "default",
      model: "clef-flash",
      types: ["noul"],
    }),
  );
});

const namesTheCaller = Effect.gen(function* test() {
  yield* lintWith("yes", {
    GITHUB_ACTIONS: "true",
    GITHUB_REPOSITORY: "acme/app",
    CLOUDFLARE_AI_GATEWAY_ID: "team-gateway",
  });
  const runs = yield* loggedRuns;
  deepStrictEqual(
    pipe(
      runs,
      Arr.map(({ gateway, metadata }) => ({ gateway, metadata })),
    ),
    [
      {
        gateway: "team-gateway",
        metadata: toJson({
          tool: "oxlint-plugin-decision",
          repo: "acme/app",
          context: "github-actions",
        }),
      },
    ],
  );
});

const passesOnNo = Effect.gen(function* test() {
  const run = yield* lintWith("no");
  strictEqual(run.status, PASSED, outputOf(run));
  deepStrictEqual(decisionLines(run), []);
});

const warnsOnDenied = Effect.gen(function* test() {
  const run = yield* lintWith("denied");
  strictEqual(run.status, PASSED, outputOf(run));
  assertInclude(run.stderr, "http 401: Authentication error");
});

const retriesRateLimits = Effect.gen(function* test() {
  const run = yield* lintWith("busy");
  strictEqual(run.status, FAILED, outputOf(run));
  deepStrictEqual(decisionLines(run), [YES_LINE]);
  const runs = yield* loggedRuns;
  strictEqual(runs.length, RETRIED);
});

const asksEachMatchWithItsSnippet = Effect.gen(function* test() {
  const env = yield* cloudflareEnv("yes");
  const run = yield* lintProject({
    files: { "log.js": TWO_CALLS },
    options: { model: `cloudflare/${MODEL}`, rules: [callRule] },
    env,
  });
  strictEqual(decisionLines(run).length, BOTH, outputOf(run));
  strictEqual((yield* loggedRuns).length, BOTH);
});

const otherRule = {
  ...callRule,
  id: "phone-call",
  question: "Does this call write a phone number to a log?",
};

const questionsOf = (runs: readonly LoggedRun[]): readonly string[] =>
  pipe(
    runs,
    Arr.flatMap(({ body }) => Rec.values(body.questions)),
    Arr.map(({ instructions }) => instructions),
  );

const CLOUDFLARE_MODEL = `cloudflare/${MODEL}`;

const rewriteConfig = (
  cwd: string,
  rules: readonly DecisionRule[],
): Effect.Effect<void, TestError, Services> =>
  Effect.gen(function* rewrite() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const files = yield* projectFilesFor({ model: CLOUDFLARE_MODEL, rules }, {});
    const write = ([name, content]: readonly [string, string]): Effect.Effect<void, TestError> =>
      fs.writeFileString(path.join(cwd, name), content);
    yield* Effect.forEach(Rec.toEntries(files), write, { concurrency: 1, discard: true });
  });

const asksOnlyTheAddedRule = Effect.scoped(
  Effect.gen(function* test() {
    const env = yield* cloudflareEnv("yes");
    const cwd = yield* writeProject({ "log.js": SOURCE });
    const lint = runOxlint({
      cwd,
      args: ["--format", "unix", "-c", "oxlint.config.ts", "log.js"],
      env,
    });
    yield* rewriteConfig(cwd, [callRule]).pipe(Effect.andThen(lint));
    yield* rewriteConfig(cwd, [callRule, otherRule]);
    const run = yield* lint;
    strictEqual(decisionLines(run).length, BOTH, outputOf(run));
    const asked = yield* loggedRuns.pipe(Effect.map(questionsOf));
    strictEqual(asked.length, BOTH);
    assertInclude(
      Option.getOrElse(Arr.last(asked), () => ""),
      otherRule.question,
    );
  }),
);

layer(nodeServices, { excludeTestServices: true })("the cloudflare provider", (it) => {
  it.effect("reports a yes answer", () => withCloudflare(reportsYes), TIMEOUT);
  it.effect(
    "asks the Workers AI decision model directly",
    () => withCloudflare(sendsTheGatewayRequest),
    TIMEOUT,
  );
  it.effect(
    "sends the repository and where it runs to the configured gateway",
    () => withCloudflare(namesTheCaller),
    TIMEOUT,
  );
  it.effect("passes on a no answer", () => withCloudflare(passesOnNo), TIMEOUT);
  it.effect(
    "warns with the Cloudflare error message",
    () => withCloudflare(warnsOnDenied),
    TIMEOUT,
  );
  it.effect(
    "asks each match with only its own snippet",
    () => withCloudflare(asksEachMatchWithItsSnippet),
    TIMEOUT,
  );
  it.effect("retries a rate limited request", () => withCloudflare(retriesRateLimits), TIMEOUT);
  it.effect(
    "asks only the added rule when the other answers are cached",
    () => withCloudflare(asksOnlyTheAddedRule),
    TIMEOUT,
  );
});
