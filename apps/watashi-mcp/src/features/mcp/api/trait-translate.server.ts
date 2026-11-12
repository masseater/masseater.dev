import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { Array as Arr, Clock, Effect, Option, String as Str, pipe } from "effect";

import type { StorageFailed } from "#/features/mcp/model/storage-failed";

import { nowIso } from "./storage.server";
import { saveTraitJa } from "./trait-ja-writer.server";
import { idOf, isActive, japaneseOf } from "./trait-state";
import type { JaRows, TraitState } from "./trait-state";
import { loadTraitJa, loadTraits } from "./trait-store.server";
import { TraitTranslator } from "./trait-translator";

type Pending = Readonly<{ id: number; trait: TraitState }>;

type TranslateFailure = StorageFailed | UpstreamFailed;

const NONE_YET = 0;

const ONE_MORE = 1;

const translated = (text: string): Effect.Effect<string, UpstreamFailed, TraitTranslator> =>
  Effect.gen(function* translateText() {
    if (Str.isEmpty(text)) {
      return text;
    }
    const translator = yield* TraitTranslator;
    return yield* translator.toJapanese(text);
  });

const translateOne = ({
  id,
  trait,
}: Pending): Effect.Effect<void, TranslateFailure, TraitTranslator> =>
  Effect.gen(function* translateTrait() {
    const statement = yield* translated(trait.statement);
    const why = yield* translated(trait.why);
    const updatedAt = yield* nowIso;
    yield* saveTraitJa({
      traitId: id,
      sourceStatement: trait.statement,
      sourceWhy: trait.why,
      statement,
      why,
      updatedAt,
    });
  });

const pendingOf = (traits: readonly TraitState[], rows: JaRows): readonly Pending[] =>
  pipe(
    traits,
    Arr.filter(isActive),
    Arr.filter((trait) => Option.isNone(japaneseOf(rows)(trait))),
    Arr.flatMap((trait) =>
      Option.toArray(Option.map(idOf(trait), (id): Pending => ({ id, trait }))),
    ),
  );

const translateFrom = (
  pending: readonly Pending[],
  deadline: number,
  done: number,
): Effect.Effect<number, TranslateFailure, TraitTranslator> =>
  Effect.gen(function* nextTrait() {
    const now = yield* Clock.currentTimeMillis;
    const next = Arr.get(pending, done);
    if (Option.isNone(next) || now >= deadline) {
      return done;
    }
    yield* translateOne(next.value);
    return yield* translateFrom(pending, deadline, done + ONE_MORE);
  });

const translateTraits = (
  deadline: number,
): Effect.Effect<number, TranslateFailure, TraitTranslator> =>
  Effect.gen(function* translateAll() {
    const traits = yield* loadTraits;
    const rows = yield* loadTraitJa;
    return yield* translateFrom(pendingOf(traits, rows), deadline, NONE_YET);
  }).pipe(Effect.withSpan("watashi.traits.translate"));

export { translateTraits };
export type { TranslateFailure };
