import { notFound } from "@tanstack/react-router";
import { Effect, Option, pipe } from "effect";

import { techniqueOf } from "#/entities/technique";
import { findEffect } from "#/features/dance-stage";

type FoundTechnique = Readonly<{ slug: string; source: string }>;

const loadTechnique = ({ slug }: Readonly<{ slug: string }>): Promise<FoundTechnique> => {
  const effect = pipe(
    techniqueOf(slug),
    Option.flatMap(() => findEffect(slug)),
  );
  const found = (source: string): FoundTechnique => ({ slug, source });
  return Effect.runPromise(
    Option.match(effect, {
      onNone: () => Effect.fail(notFound()),
      onSome: Effect.map(found),
    }),
  );
};

export type { FoundTechnique };
export { loadTechnique };
