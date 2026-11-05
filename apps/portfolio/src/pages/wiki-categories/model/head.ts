import { categoryPath } from "#/entities/entry";
import { wiki } from "#/shared/config";
import { defaultImage, seo, wikiPageTitle } from "#/shared/lib";
import type { Head } from "#/shared/lib";

const categoriesHead: Head = seo({
  title: wikiPageTitle(wiki.labels.categories),
  description: "Sloppedia の記事をカテゴリごとに並べた一覧",
  path: `${categoryPath("sloppedia")}/categories`,
  type: "website",
  image: defaultImage,
  extra: [],
  structuredData: [],
});

export { categoriesHead };
