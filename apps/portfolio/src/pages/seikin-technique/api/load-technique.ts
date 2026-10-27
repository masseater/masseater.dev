import { notFound } from "@tanstack/react-router";
import { Effect, Option } from "effect";

import { techniqueOf } from "#/entities/technique";
import { loadEffect } from "#/features/dance-stage";

type Shader = Readonly<{ status: "ready"; source: string }> | Readonly<{ status: "pending" }>;

type FoundTechnique = Readonly<{ slug: string; shader: Shader }>;

const loadTechnique = ({ slug }: Readonly<{ slug: string }>): Promise<FoundTechnique> =>
  Effect.runPromise(
    Option.match(techniqueOf(slug), {
      onNone: () => Effect.fail(notFound()),
      onSome: () =>
        loadEffect(slug).pipe(
          Effect.map((source): FoundTechnique => ({
            slug,
            shader: Option.match(source, {
              onNone: (): Shader => ({ status: "pending" }),
              onSome: (found): Shader => ({ status: "ready", source: found }),
            }),
          })),
        ),
    }),
  );

export type { FoundTechnique, Shader };
export { loadTechnique };
