import { notFound } from "@tanstack/react-router";
import { Effect, Option } from "effect";

import { techniqueOf } from "#/entities/technique";
import { hasEffect, loadEffect } from "#/features/dance-stage";

type FoundTechnique = Readonly<{ slug: string; source: string }>;

const hasDance = (slug: string): boolean => Option.isSome(techniqueOf(slug)) && hasEffect(slug);

const foundTechnique = (slug: string): Effect.Effect<FoundTechnique, ReturnType<typeof notFound>> =>
  loadEffect(slug).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.fail(notFound()),
        onSome: (source) => Effect.succeed<FoundTechnique>({ slug, source }),
      }),
    ),
  );

const loadTechnique = ({ slug }: Readonly<{ slug: string }>): Promise<FoundTechnique> => {
  if (!hasDance(slug)) {
    return Effect.runPromise(Effect.fail(notFound()));
  }
  return Effect.runPromise(foundTechnique(slug));
};

export type { FoundTechnique };
export { loadTechnique };
