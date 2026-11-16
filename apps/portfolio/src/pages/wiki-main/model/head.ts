import { sectionPath } from "#/shared/config/index.ts";
import { defaultImage, seo, wikiPageTitle } from "#/shared/lib/index.ts";
import type { Head } from "#/shared/lib/index.ts";
import { wiki } from "#/shared/wiki/index.ts";

export const mainHead: Head = seo({
  title: wikiPageTitle(wiki.labels.mainPage),
  description: wiki.tagline,
  path: `${sectionPath("sloppedia")}/`,
  type: "website",
  image: defaultImage,
  extra: [],
  structuredData: [],
});
