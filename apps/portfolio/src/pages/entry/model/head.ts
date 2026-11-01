import { Option } from "effect";

import { categoryMeta, categoryPath, entryOgImagePath, entryPath } from "#/entities/entry";
import type { Entry } from "#/entities/entry";
import type { FoundEntry } from "#/pages/entry/api/load-entry";
import { site } from "#/shared/config";
import { absoluteUrl, author, notFoundHead, pageTitle, seo } from "#/shared/lib";
import type { JsonLd, Head } from "#/shared/lib";

const breadcrumb = (entry: Entry): JsonLd => ({
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: site.name, item: absoluteUrl("/") },
    {
      "@type": "ListItem",
      position: 2,
      name: categoryMeta[entry.category].title,
      item: absoluteUrl(categoryPath(entry.category)),
    },
    { "@type": "ListItem", position: 3, name: entry.title },
  ],
});

const article = (entry: Entry): JsonLd => ({
  "@type": categoryMeta[entry.category].schemaType,
  headline: entry.title,
  description: entry.description,
  url: absoluteUrl(entryPath(entry)),
  mainEntityOfPage: absoluteUrl(entryPath(entry)),
  image: absoluteUrl(entryOgImagePath(entry)),
  datePublished: entry.date,
  dateModified: entry.updated,
  inLanguage: site.locale,
  keywords: entry.tags,
  author,
  publisher: author,
});

const entryHead = (loaded: FoundEntry | undefined): Head =>
  Option.match(Option.fromUndefinedOr(loaded), {
    onNone: () => notFoundHead,
    onSome: ({ entry }) =>
      seo({
        title: pageTitle(entry.title),
        description: entry.description,
        path: entryPath(entry),
        type: "article",
        image: { path: entryOgImagePath(entry), alt: entry.title },
        extra: [
          { property: "article:published_time", content: entry.date },
          { property: "article:modified_time", content: entry.updated },
          { property: "article:section", content: categoryMeta[entry.category].title },
        ],
        structuredData: [article(entry), breadcrumb(entry)],
      }),
  });

export { entryHead };
