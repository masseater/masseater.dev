import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { Array as Arr, Effect, Option, Record as Rec, pipe } from "effect";

import type { AnalystFailed } from "#/features/mcp/model/analyst-failed";
import type { StorageFailed } from "#/features/mcp/model/storage-failed";

import { TraitAnalyst } from "./trait-analyst";
import { checkObservations, knownTraits } from "./trait-check";
import { embedTexts } from "./trait-embed.server";
import type { BatchSource, Candidates, Checked, TraitState } from "./trait-state";
import { loadTraitVectors, loadTraits } from "./trait-store.server";
import { candidatesOf, unionOf } from "./trait-vector";

type Asked = Readonly<{ traits: readonly TraitState[]; checked: Checked }>;

type Present = Arr.NonEmptyReadonlyArray<BatchSource>;

const NOTHING_CHECKED: Checked = { accepted: [], rejected: 0 };

const presentOf = (batch: readonly BatchSource[]): readonly BatchSource[] =>
  pipe(
    batch,
    Arr.filter((item) => item.present),
  );

const candidatesFor = (
  traits: readonly TraitState[],
  present: Present,
): Effect.Effect<Candidates, StorageFailed | UpstreamFailed> =>
  Effect.gen(function* findCandidates() {
    const vectors = yield* loadTraitVectors;
    const embedded = yield* embedTexts(
      pipe(
        present,
        Arr.map((item) => item.source.text),
      ),
    );
    const sources = Arr.zipWith(present, embedded, (item, vector) => ({
      ref: item.source.ref,
      vector,
    }));
    return candidatesOf({ traits, vectors, sources });
  });

const askAnalyst = (
  traits: readonly TraitState[],
  batch: readonly BatchSource[],
  present: Present,
): Effect.Effect<Checked, AnalystFailed | StorageFailed | UpstreamFailed, TraitAnalyst> =>
  Effect.gen(function* askTraitAnalyst() {
    const candidates = yield* candidatesFor(traits, present);
    const analyst = yield* TraitAnalyst;
    const result = yield* analyst.analyze({
      sources: pipe(
        present,
        Arr.map(({ source }) => ({
          ref: source.ref,
          text: source.text,
          candidates: pipe(
            Rec.get(candidates, source.ref),
            Option.getOrElse((): readonly string[] => []),
          ),
        })),
      ),
      traits: knownTraits({ traits, wanted: unionOf(candidates) }),
    });
    return checkObservations({ traits, batch, observations: result.observations, candidates });
  });

const askAbout = (
  batch: readonly BatchSource[],
): Effect.Effect<Asked, AnalystFailed | StorageFailed | UpstreamFailed, TraitAnalyst> =>
  Effect.gen(function* askAboutBatch() {
    const traits = yield* loadTraits;
    const checked = yield* Arr.match(presentOf(batch), {
      onEmpty: () => Effect.succeed(NOTHING_CHECKED),
      onNonEmpty: (present) => askAnalyst(traits, batch, present),
    });
    return { traits, checked };
  });

export { askAbout };
