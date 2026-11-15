import { sectionPath } from "#/shared/config";
import { defaultImage, seo, wikiPageTitle } from "#/shared/lib";
import type { Head } from "#/shared/lib";
import { wiki } from "#/shared/wiki";

export const categoriesHead: Head = seo({
  title: wikiPageTitle(wiki.labels.categories),
  description: "Sloppedia の記事をカテゴリごとに並べた一覧",
  path: `${sectionPath("sloppedia")}/categories`,
  type: "website",
  image: defaultImage,
  extra: [],
  structuredData: [],
});
