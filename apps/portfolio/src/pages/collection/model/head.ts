import { Option } from "effect";

import { categoryMeta } from "#/entities/entry/index.ts";
import type { FoundCollection } from "#/pages/collection/api/load-collection.ts";
import { sectionPath } from "#/shared/config/index.ts";
import { defaultImage, notFoundHead, pageTitle, seo } from "#/shared/lib/index.ts";
import type { Head } from "#/shared/lib/index.ts";

export const collectionHead = (loaded: FoundCollection | undefined): Head =>
  Option.match(Option.fromUndefinedOr(loaded), {
    onNone: () => notFoundHead,
    onSome: ({ category }) =>
      seo({
        title: pageTitle(categoryMeta[category].title),
        description: categoryMeta[category].description,
        path: sectionPath(category),
        type: "website",
        image: defaultImage,
        extra: [],
        structuredData: [],
      }),
  });
