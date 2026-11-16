import { Array as Arr, pipe } from "effect";

import { site } from "#/shared/config/index.ts";
import { author, defaultImage, seo } from "#/shared/lib/index.ts";
import type { Head } from "#/shared/lib/index.ts";

export const homeHead: Head = seo({
  title: site.name,
  description: site.description,
  path: "/",
  type: "website",
  image: defaultImage,
  extra: [],
  structuredData: [
    {
      "@type": "WebSite",
      name: site.name,
      url: site.url,
      description: site.description,
      inLanguage: site.locale,
      author: {
        ...author,
        sameAs: pipe(
          site.links,
          Arr.map(({ href }) => href),
        ),
      },
    },
  ],
});
