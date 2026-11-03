import { Option } from "effect";

import { entryOgImagePath, entryPath } from "#/entities/entry";
import type { FoundArticle } from "#/pages/wiki-article/api/load-article";
import { notFoundHead, seo, wikiPageTitle } from "#/shared/lib";
import type { Head } from "#/shared/lib";

const articleHead = (loaded: FoundArticle | undefined): Head =>
  Option.match(Option.fromUndefinedOr(loaded), {
    onNone: () => notFoundHead,
    onSome: ({ entry }) =>
      seo({
        title: wikiPageTitle(entry.title),
        description: entry.description,
        path: entryPath(entry),
        type: "article",
        image: { path: entryOgImagePath(entry), alt: entry.title },
        extra: [
          { property: "article:published_time", content: entry.date },
          { property: "article:modified_time", content: entry.updated },
        ],
        structuredData: [],
      }),
  });

export { articleHead };
