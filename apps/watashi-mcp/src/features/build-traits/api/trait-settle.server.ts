import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { Array as Arr, Effect, Record as Rec, pipe } from "effect";

import { planTraits, isActive, keyText, supportsOf } from "#/entities/trait";
import type { Plan, Step } from "#/entities/trait";
import { embedTexts } from "#/entities/trait/index.server";
import type { VectorTexts } from "#/entities/trait/index.server";
import { encodeJson } from "#/shared/db/index.server";

type Settled = Readonly<{ plan: Plan; vectors: VectorTexts }>;

const quotesOf = (trait: Plan["touched"][number]): string =>
  pipe(
    supportsOf(trait),
    Arr.map((item) => item.quote),
    Arr.join("\n"),
  );

const vectorsOf = (plan: Plan): Effect.Effect<VectorTexts, UpstreamFailed> => {
  const active = pipe(plan.touched, Arr.filter(isActive));
  return embedTexts(pipe(active, Arr.map(quotesOf))).pipe(
    Effect.flatMap(Effect.forEach(encodeJson)),
    Effect.map((texts) =>
      Rec.fromEntries(
        Arr.zipWith(active, texts, (trait, text) => [keyText(trait.key), text] as const),
      ),
    ),
  );
};

const settle = (step: Step): Effect.Effect<Settled, UpstreamFailed> => {
  const plan = planTraits(step);
  return vectorsOf(plan).pipe(Effect.map((vectors) => ({ plan, vectors })));
};

export { settle };
export type { Settled };
