import { sectionMeta, sectionPath } from "#/shared/config";
import { defaultImage, pageTitle, seo } from "#/shared/lib";
import type { Head } from "#/shared/lib";

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
