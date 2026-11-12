import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { Effect, Option } from "effect";

import type { AnalystFailed } from "#/features/mcp/model/analyst-failed";
import type { StorageFailed } from "#/features/mcp/model/storage-failed";

import type { TraitAnalyst } from "./trait-analyst";
import { askAbout } from "./trait-ask.server";
import type { Collected } from "./trait-batch";
import { settle } from "./trait-settle.server";
import { collectSources } from "./trait-sources.server";
import { saveTraits } from "./trait-writer.server";

type StepOutcome =
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

type StepFailure = StorageFailed | UpstreamFailed | AnalystFailed;

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

const buildStep: Effect.Effect<StepOutcome, StepFailure, TraitAnalyst> = collectSources.pipe(
  Effect.flatMap(
    Option.match({
      onNone: () => Effect.succeed(IDLE),
      onSome: advance,
    }),
  ),
  Effect.withSpan("watashi.traits.step"),
);

export { buildStep };
export type { StepFailure, StepOutcome };
