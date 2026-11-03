import { notFound } from "@tanstack/react-router";
import { Effect, Option, pipe } from "effect";

import { techniqueOf } from "#/entities/technique";
import { effectLoader } from "#/features/dance-stage";

type FoundTechnique = Readonly<{ slug: string; source: string }>;

const sourceOf = (slug: string): Effect.Effect<string, ReturnType<typeof notFound>> =>
  pipe(
    techniqueOf(slug),
    Option.flatMap(() => effectLoader(slug)),
    Option.getOrElse(() => Effect.fail(notFound())),
  );

const loadTechnique = ({ slug }: Readonly<{ slug: string }>): Promise<FoundTechnique> =>
  Effect.runPromise(
    pipe(
      sourceOf(slug),
      Effect.map((source): FoundTechnique => ({ slug, source })),
    ),
  );

export type { FoundTechnique };
export { loadTechnique };
