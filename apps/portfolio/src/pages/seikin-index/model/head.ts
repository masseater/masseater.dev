import { ROOT } from "#/entities/technique";
import { defaultImage, pageTitle, seo } from "#/shared/lib";
import type { Head } from "#/shared/lib";

import { INTRO, TITLE } from "./copy";

const seikinIndexHead: Head = seo({
  title: pageTitle(TITLE),
  description: INTRO,
  path: `${ROOT}/`,
  type: "website",
  image: defaultImage,
  extra: [],
  structuredData: [],
});

export { seikinIndexHead };
