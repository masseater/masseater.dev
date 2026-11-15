import { Array as Arr, Clock, Effect, Schema } from "effect";

import type { Finding } from "#/entities/exposure/index.ts";
import { planProbes, privateSurface } from "#/entities/exposure/index.ts";
import { cloudflareInventory, repositories } from "#/features/collect-inventory/index.ts";
import { findExposures } from "#/features/find-exposures/index.ts";
import { remember, report, counts, reported } from "#/features/report-exposures/index.ts";
import { runProbes } from "#/features/run-probes/index.ts";

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
export const check = checkAccount;
