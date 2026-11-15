import { Option } from "effect";

import { categoryMeta } from "#/entities/entry";
import type { FoundCollection } from "#/pages/collection/api/load-collection";
import { sectionPath } from "#/shared/config";
import { defaultImage, notFoundHead, pageTitle, seo } from "#/shared/lib";
import type { Head } from "#/shared/lib";

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
