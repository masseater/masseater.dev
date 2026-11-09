import { portfolio } from "@masseater.dev/ui/portfolio";

const sections = ["projects", "blogs", "sloppedia"] as const;

type Section = (typeof sections)[number];

const sectionMeta = {
  projects: {
    title: portfolio.sections.projects,
    description: "作ったもの",
    titleTransition: "vt-category-projects",
  },
  blogs: {
    title: portfolio.sections.blogs,
    description: "まとまった文章",
    titleTransition: "vt-category-blogs",
  },
  sloppedia: {
    title: portfolio.sections.sloppedia,
    description: "個人の百科事典もどき",
    titleTransition: "vt-category-sloppedia",
  },
} as const satisfies Record<
  Section,
  Readonly<{ title: string; description: string; titleTransition: string }>
>;

const sectionPath = (section: Section): string => `/${section}`;

export type { Section };
export { sectionMeta, sectionPath, sections };
