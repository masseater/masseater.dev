import { sectionMeta, sectionPath } from "#/shared/config";
import { defaultImage, pageTitle, seo } from "#/shared/lib";
import type { Head } from "#/shared/lib";

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
