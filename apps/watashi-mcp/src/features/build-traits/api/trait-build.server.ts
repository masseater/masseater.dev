import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { Effect, Option } from "effect";

import type { AnalystFailed, TraitAnalyst, Collected } from "#/entities/trait";
import { saveTraits } from "#/entities/trait/index.server";
import type { StorageFailed } from "#/shared/db";

import { askAbout } from "./trait-ask.server.ts";
import { settle } from "./trait-settle.server.ts";
import { collectSources } from "./trait-sources.server.ts";

export type StepOutcome =
  | Readonly<{ status: "idle" }>
  | Readonly<{
      status: "progressed";
      origin: Collected["origin"];
      sources: number;
      accepted: number;
      rejected: number;
      touched: number;
      created: number;
      retracted: number;
    }>;

export type StepFailure = StorageFailed | UpstreamFailed | AnalystFailed;

const ACTOR = "trait-builder";

const IDLE: StepOutcome = { status: "idle" };

const advance = ({
  origin,
  batch,
  position,
}: Collected): Effect.Effect<StepOutcome, StepFailure, TraitAnalyst> =>
  Effect.gen(function* advanceTraits() {
    const { traits, checked } = yield* askAbout(batch);
    const { plan, vectors } = yield* settle({ traits, batch, observations: checked.accepted });
    yield* saveTraits({ plan, vectors, cursor: { origin, position }, actor: ACTOR });
    const outcome: StepOutcome = {
      status: "progressed",
      origin,
      sources: batch.length,
      accepted: checked.accepted.length,
      rejected: checked.rejected,
      touched: plan.touched.length,
      created: plan.created,
      retracted: plan.retracted,
    };
    return outcome;
  });

export const buildStep: Effect.Effect<StepOutcome, StepFailure, TraitAnalyst> = collectSources.pipe(
  Effect.flatMap(
    Option.match({
      onNone: () => Effect.succeed(IDLE),
      onSome: advance,
    }),
  ),
  Effect.withSpan("watashi.traits.step"),
);
