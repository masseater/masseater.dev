import { NodeServices } from "@effect/platform-node";
import { layer } from "@effect/vitest";
import { assertInclude, deepStrictEqual, strictEqual } from "@effect/vitest/utils";
import { Array as Arr, Effect, Layer, Option, pipe } from "effect";

import { yesByLabel } from "#/features/serve-decisions/index.ts";

import {
  FAILED,
  PASSED,
  TIMEOUT,
  callRule,
  lintProject,
  outputOf,
} from "./fixtures.test.support.ts";
import { MockCloudflareLayer, cloudflareEnv, loggedChats } from "./mock-cloudflare.test.support.ts";
import type { LoggedChat, MockCloudflare } from "./mock-cloudflare.test.support.ts";
import { decisionLines } from "./oxlint.test.support.ts";
import type { OxlintRun, Services, TestError } from "./oxlint.test.support.ts";

type CloudflareTest<Value = void> = Effect.Effect<Value, TestError, Services | MockCloudflare>;

const MODEL = "@cf/test/model";
const SOURCE = "console.log(user.email, user.phone);\n";
const YES_LINE = `log.js:1:1: [any-call] cloudflare/${MODEL} answered yes (0.95 >= 0.80): Does this call write personal data to a log? [Error/decision(any-call)]`;
const RETRIED = 2;
const TWO_CALLS = "console.log(user.email);\nconsole.log(user.phone);\n";
const ONE_REQUEST = 1;
const BOTH = 2;
const PERCENT = 100;
const FIRST = 0;
const SECOND = 1;
const MOSTLY = 0.6;
const SOME = 0.2;
const NEARLY_ALL = 0.9;
const LITTLE = 0.1;
const MOSTLY_YES = 80;
const LITTLE_YES = 10;

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

const summaryOf = ({ url, authorization, gateway, body }: LoggedChat): object => ({
  url,
  authorization,
  gateway,
  model: body.model,
  logprobs: body.logprobs,
  template: body.chat_template_kwargs,
});

const sendsTheGatewayRequest = Effect.gen(function* test() {
  yield* lintWith("yes");
  const chats = yield* loggedChats;
  deepStrictEqual(
    pipe(Arr.head(chats), Option.map(summaryOf)),
    Option.some({
      url: "/client/v4/accounts/account-id/ai/v1/chat/completions",
      authorization: "Bearer yes",
      gateway: "lint-gateway",
      model: MODEL,
      logprobs: true,
      template: { enable_thinking: false, thinking: false },
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
  const chats = yield* loggedChats;
  strictEqual(chats.length, RETRIED);
});

const asksTheFileAtOnce = Effect.gen(function* test() {
  const env = yield* cloudflareEnv("yes");
  const run = yield* lintProject({
    files: { "log.js": TWO_CALLS },
    options: { model: `cloudflare/${MODEL}`, rules: [callRule] },
    env,
  });
  strictEqual(decisionLines(run).length, BOTH, outputOf(run));
  strictEqual((yield* loggedChats).length, ONE_REQUEST);
});

type Alternative = readonly [string, number];

const token = (
  text: string,
  alternatives: readonly Alternative[] = [],
): Readonly<{
  token: string;
  logprob: number;
  top_logprobs: readonly Readonly<{ token: string; logprob: number }>[];
}> => ({
  token: text,
  logprob: 0,
  top_logprobs: pipe(
    alternatives,
    Arr.map(([alternative, probability]) => ({
      token: alternative,
      logprob: Math.log(probability),
    })),
  ),
});

const readsEachLabel = Effect.sync(() => {
  const found = yesByLabel([
    token("q"),
    token("1"),
    token(":"),
    token(" yes", [
      [" yes", MOSTLY],
      [" no", SOME],
      ["Yes", SOME],
    ]),
    token("\n"),
    token("q2:"),
    token(" no", [
      [" no", NEARLY_ALL],
      [" yes", LITTLE],
    ]),
  ]);
  deepStrictEqual(
    pipe(
      [...found.entries()],
      Arr.map(([index, yes]) => [index, Math.round(yes * PERCENT)] as const),
    ),
    [
      [FIRST, MOSTLY_YES],
      [SECOND, LITTLE_YES],
    ],
  );
});

layer(NodeServices.layer, { excludeTestServices: true })("the cloudflare provider", (it) => {
  it.effect("reports a yes answer", () => withCloudflare(reportsYes), TIMEOUT);
  it.effect(
    "calls the AI Gateway chat completions endpoint",
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
    "asks every match in a file in one request",
    () => withCloudflare(asksTheFileAtOnce),
    TIMEOUT,
  );
  it.effect("retries a rate limited request", () => withCloudflare(retriesRateLimits), TIMEOUT);
  it.effect("reads the yes probability of each labelled answer", () => readsEachLabel);
});
