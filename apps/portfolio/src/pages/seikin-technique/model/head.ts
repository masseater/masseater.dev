import { Array as Arr, Option, pipe } from "effect";

import { techniqueOf, techniquePath } from "#/entities/technique/index.ts";
import type { Technique } from "#/entities/technique/index.ts";
import type { FoundTechnique } from "#/pages/seikin-technique/api/load-technique.ts";
import { defaultImage, notFoundHead, pageTitle, seo } from "#/shared/lib/index.ts";
import type { Head } from "#/shared/lib/index.ts";

const descriptionOf = (technique: Technique): string =>
  pipe(
    Arr.headNonEmpty(technique.origins).summary,
    Arr.head,
    Option.getOrElse(() => technique.name),
  );

export const techniqueHead = (loaded: FoundTechnique | undefined): Head =>
  pipe(
    Option.fromUndefinedOr(loaded),
    Option.flatMap(({ slug }) => techniqueOf(slug)),
    Option.match({
      onNone: () => notFoundHead,
      onSome: (technique) =>
        seo({
          title: pageTitle(`${technique.name}をセイキンダンスで`),
          description: descriptionOf(technique),
          path: techniquePath(technique.slug),
          type: "article",
          image: defaultImage,
          extra: [],
          structuredData: [],
        }),
    }),
  );
