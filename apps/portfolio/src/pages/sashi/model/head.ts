import { sectionMeta, sectionPath } from "#/shared/config/index.ts";
import { defaultImage, pageTitle, seo } from "#/shared/lib/index.ts";
import type { Head } from "#/shared/lib/index.ts";

export const sashiHead = (): Head =>
  seo({
    title: pageTitle(sectionMeta.sashi.title),
    description: sectionMeta.sashi.description,
    path: sectionPath("sashi"),
    type: "website",
    image: defaultImage,
    extra: [],
    structuredData: [],
  });
