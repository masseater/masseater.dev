import { notFound } from "@tanstack/react-router";
import { Effect, Option } from "effect";

import { techniqueOf } from "#/entities/technique";
import { effectLoader } from "#/features/dance-stage";

export type FoundTechnique = Readonly<{ slug: string; source: string }>;

const danceSource = (slug: string): Option.Option<Effect.Effect<string>> =>
  Option.flatMap(techniqueOf(slug), () => effectLoader(slug));

export const loadTechnique = ({ slug }: Readonly<{ slug: string }>): Promise<FoundTechnique> =>
  Effect.runPromise(
    Option.match(danceSource(slug), {
      onNone: () => Effect.fail(notFound()),
      onSome: Effect.map((source): FoundTechnique => ({ slug, source })),
    }),
  );
