import { sectionMeta, sectionPath } from "#/shared/config/index.ts";
import { defaultImage, pageTitle, seo } from "#/shared/lib/index.ts";
import type { Head } from "#/shared/lib/index.ts";

export const projectsHead = (): Head =>
  seo({
    title: pageTitle(sectionMeta.projects.title),
    description: sectionMeta.projects.description,
    path: sectionPath("projects"),
    type: "website",
    image: defaultImage,
    extra: [],
    structuredData: [],
  });
