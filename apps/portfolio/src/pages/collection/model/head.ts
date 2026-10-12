import { Option } from "effect";

import { categoryMeta, categoryPath } from "#/entities/entry";
import type { FoundCollection } from "#/pages/collection/api/load-collection";
import { notFoundHead, pageTitle, seo } from "#/shared/lib";
import type { Head } from "#/shared/lib";

const collectionHead = (loaded: FoundCollection | undefined): Head =>
  Option.match(Option.fromUndefinedOr(loaded), {
    onNone: () => notFoundHead,
    onSome: ({ category }) =>
      seo({
        title: pageTitle(categoryMeta[category].title),
        description: categoryMeta[category].description,
        path: categoryPath(category),
        type: "website",
      }),
  });

export { collectionHead };
