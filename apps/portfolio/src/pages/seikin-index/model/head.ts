import { ROOT } from "#/entities/technique/index.ts";
import { defaultImage, pageTitle, seo } from "#/shared/lib/index.ts";
import type { Head } from "#/shared/lib/index.ts";

import { INTRO, TITLE } from "./copy";

export const seikinIndexHead: Head = seo({
  title: pageTitle(TITLE),
  description: INTRO,
  path: `${ROOT}/`,
  type: "website",
  image: defaultImage,
  extra: [],
  structuredData: [],
});
