import { sectionMeta, sectionPath } from "#/shared/config";
import { defaultImage, pageTitle, seo } from "#/shared/lib";
import type { Head } from "#/shared/lib";

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
