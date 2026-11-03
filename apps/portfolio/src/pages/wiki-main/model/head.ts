import { categoryPath } from "#/entities/entry";
import { wiki } from "#/shared/config";
import { defaultImage, seo, wikiPageTitle } from "#/shared/lib";
import type { Head } from "#/shared/lib";

const mainHead: Head = seo({
  title: wikiPageTitle("メインページ"),
  description: wiki.tagline,
  path: `${categoryPath("sloppedia")}/`,
  type: "website",
  image: defaultImage,
  extra: [],
  structuredData: [],
});

export { mainHead };
