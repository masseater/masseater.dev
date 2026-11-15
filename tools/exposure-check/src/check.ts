import { Array as Arr, Clock, Effect, Schema } from "effect";

import { remember, report } from "./broker.ts";
import { cloudflareInventory } from "./cloudflare.ts";
import { findExposures } from "./findings.ts";
import type { Finding } from "./fingerprint.ts";
import { repositories } from "./github.ts";
import { planProbes } from "./probes.ts";
import { counts, reported } from "./report.ts";
import { runProbes } from "./run-probes.ts";
import { privateSurface } from "./surface.ts";

const NOTHING = { hosts: [], workers: [], repositories: [] };

const taggedError = Schema.TaggedError;

class Exposed extends taggedError<Exposed, { readonly brand: unique symbol }>()("Exposed", {
  findings: Schema.Finite,
  notified: Schema.Boolean,
}) {}

const observe = Effect.fn("exposure.observe")(function* observe(accountId: string) {
  const cloudflare = yield* cloudflareInventory(accountId);
  const repos = yield* repositories;
  const inventory = { ...cloudflare, repositories: repos };
  const observed = privateSurface({ inventory, remembered: NOTHING });
  const remembered = yield* remember(observed);
  return { inventory, surface: privateSurface({ inventory, remembered }) };
});

const judge = Effect.fn("exposure.judge")(function* judge(findings: readonly Finding[]) {
  const { notified } = yield* report(reported(findings));
  const summary = Arr.join(counts(findings), ", ");
  yield* Effect.logInfo("exposure.judged").pipe(
    Effect.annotateLogs({ findings: summary, notified }),
  );
  if (Arr.isReadonlyArrayNonEmpty(findings)) {
    return yield* Exposed.make({ findings: findings.length, notified });
  }
  return findings.length;
});

const checkAccount = Effect.fn("exposure.check")(function* checkAccount(accountId: string) {
  const scene = yield* observe(accountId);
  const now = yield* Clock.currentTimeMillis;
  const nonce = `exposure-${String(now)}`;
  const probes = yield* runProbes(planProbes({ ...scene, nonce }));
  yield* Effect.logInfo("exposure.checked").pipe(
    Effect.annotateLogs({
      hosts: scene.surface.hosts.length,
      workers: scene.surface.workers.length,
      repositories: scene.surface.repositories.length,
      probes: probes.length,
    }),
  );
  return yield* judge(findExposures({ ...scene, probes }));
});

/** @internal */
const check = checkAccount;

export { check };
