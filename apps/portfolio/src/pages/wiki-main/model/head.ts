import { categoryPath } from "#/entities/entry";
import { defaultImage, seo, wikiPageTitle } from "#/shared/lib";
import type { Head } from "#/shared/lib";
import { wiki } from "#/shared/wiki";

const mainHead: Head = seo({
  title: wikiPageTitle(wiki.labels.mainPage),
  description: wiki.tagline,
  path: `${categoryPath("sloppedia")}/`,
  type: "website",
  image: defaultImage,
  extra: [],
  structuredData: [],
});

export { mainHead };
