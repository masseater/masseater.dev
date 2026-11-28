import { Array as Arr, Clock, Console, Effect, Option, Schema } from "effect";
import { Command, Flag } from "effect/cli";

import { lineOf, sortedFindings } from "#/entities/finding/index.ts";
import type { Finding } from "#/entities/finding/index.ts";
import { seedOfDay } from "#/entities/horde-seed/index.ts";
import { findCustomDomains, findPublicHosts } from "#/features/find-public-hosts/index.ts";
import { fuzzMcp } from "#/features/fuzz-mcp/index.ts";
import { probePublishedCli } from "#/features/probe-published-cli/index.ts";
import { readAccessTokens } from "#/features/read-access-tokens/index.ts";
import {
  desktopTargetsOf,
  findDesktopApps,
  siteTargetsOf,
  unleashGremlins,
} from "#/features/unleash-gremlins/index.ts";

const taggedError = Schema.TaggedError;

class FindingsFound extends taggedError<FindingsFound, { readonly brand: unique symbol }>()(
  "FindingsFound",
  { count: Schema.Finite },
) {}

const NONE = 0;
const ANY_COUNT = 0;

type Options = Readonly<{ hosts: readonly string[]; seed: Option.Option<number> }>;

const judge = (findings: readonly Finding[]): Effect.Effect<number, FindingsFound> =>
  Arr.match(findings, {
    onEmpty: () => Effect.succeed(NONE),
    onNonEmpty: (some) => FindingsFound.make({ count: some.length }),
  });

const hordeSeed = (given: Option.Option<number>): Effect.Effect<number> =>
  Option.match(given, {
    onSome: (seed) => Effect.succeed(seed),
    onNone: () => Clock.currentTimeMillis.pipe(Effect.map((now) => seedOfDay(now))),
  });

const probeSites = Effect.fn("monkey.sites")(function* probeSites(options: Options, seed: number) {
  const publicHosts = yield* findPublicHosts(options.hosts);
  const tokens = yield* readAccessTokens();
  const apps = yield* findDesktopApps();
  const pages = yield* unleashGremlins([
    ...siteTargetsOf({ publicHosts, tokens, seed }),
    ...desktopTargetsOf({ apps, seed }),
  ]);
  const domains = yield* findCustomDomains(options.hosts);
  const tools = yield* fuzzMcp({ domains, tokens, seed });
  return [...pages, ...tools];
});

const report = Effect.fn("monkey.report")(function* report(
  input: Readonly<{ seed: number; findings: readonly Finding[] }>,
) {
  yield* Effect.forEach(input.findings, (found) => Console.log(`monkey.finding ${lineOf(found)}`), {
    concurrency: 1,
  });
  yield* Console.log(
    `monkey.done seed=${String(input.seed)} findings=${String(input.findings.length)}`,
  );
});

const monkey = Effect.fn("monkey.run")(function* monkey(options: Options) {
  const seed = yield* hordeSeed(options.seed);
  const cli = yield* probePublishedCli();
  const sites = yield* probeSites(options, seed);
  const findings = sortedFindings([...cli, ...sites]);
  yield* report({ seed, findings });
  return yield* judge(findings);
});

const command = Command.make(
  "monkey-test",
  {
    hosts: Flag.String("host").pipe(Flag.atLeast(ANY_COUNT)),
    seed: Flag.Int("seed").pipe(Flag.optional),
  },
  monkey,
);

/** @internal */
export const monkeyTest = Command.run(command, { version: "0.0.0" });
