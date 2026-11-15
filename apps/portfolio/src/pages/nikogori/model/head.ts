import { sectionMeta, sectionPath } from "#/shared/config/index.ts";
import { defaultImage, pageTitle, seo } from "#/shared/lib/index.ts";
import type { Head } from "#/shared/lib/index.ts";

export const nikogoriHead = (): Head =>
  seo({
    title: pageTitle(sectionMeta.nikogori.title),
    description: sectionMeta.nikogori.description,
    path: sectionPath("nikogori"),
    type: "website",
    image: defaultImage,
    extra: [],
    structuredData: [],
  });
