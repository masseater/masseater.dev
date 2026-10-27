import { notFound } from "@tanstack/react-router";
import { Effect, Option } from "effect";

import { techniqueOf } from "#/entities/technique";
import { loadEffect } from "#/features/dance-stage";

type FoundTechnique = Readonly<{ slug: string; source: string }>;

const loadTechnique = ({ slug }: Readonly<{ slug: string }>): Promise<FoundTechnique> =>
  Effect.runPromise(
    Option.match(techniqueOf(slug), {
      onNone: () => Effect.fail(notFound()),
      onSome: () =>
        loadEffect(slug).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.fail(notFound()),
              onSome: (source) => Effect.succeed<FoundTechnique>({ slug, source }),
            }),
          ),
        ),
    }),
  );

export type { FoundTechnique };
export { loadTechnique };
