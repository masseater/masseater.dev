import { sectionMeta, sectionPath } from "#/shared/config/index.ts";
import { defaultImage, pageTitle, seo } from "#/shared/lib/index.ts";
import type { Head } from "#/shared/lib/index.ts";

export const aiProducedHead = (): Head =>
  seo({
    title: pageTitle(sectionMeta["ai-produced"].title),
    description: sectionMeta["ai-produced"].description,
    path: sectionPath("ai-produced"),
    type: "website",
    image: defaultImage,
    extra: [],
    structuredData: [],
  });
