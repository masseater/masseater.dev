import { NodeServices } from "@effect/platform-node";
import { layer } from "@effect/vitest";
import { assertInclude, deepStrictEqual, strictEqual } from "@effect/vitest/utils";
import { Array as Arr, Effect, Layer, Option, Record as Rec, pipe } from "effect";

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
import { decisionLines } from "./oxlint.test.support.ts";
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

const lintWith = (token: string): CloudflareTest<OxlintRun> =>
  Effect.gen(function* lint() {
    const env = yield* cloudflareEnv(token);
    return yield* lintProject({
      files: { "log.js": SOURCE },
      options: { model: `cloudflare/${MODEL}`, rules: [callRule] },
      env,
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

layer(NodeServices.layer, { excludeTestServices: true })("the cloudflare provider", (it) => {
  it.effect("reports a yes answer", () => withCloudflare(reportsYes), TIMEOUT);
  it.effect(
    "asks the Workers AI decision model directly",
    () => withCloudflare(sendsTheGatewayRequest),
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
});
