import { portfolio } from "@masseater.dev/ui/portfolio";

export const sections = ["projects", "blogs", "sloppedia", "nikogori", "ai-produced"] as const;

export type Section = (typeof sections)[number];

export const sectionMeta = {
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
  nikogori: {
    title: portfolio.sections.nikogori,
    description: "AI がコードだけで描いた絵",
    titleTransition: "vt-category-nikogori",
  },
  "ai-produced": {
    title: portfolio.sections["ai-produced"],
    description: "AI がコードだけで作った曲",
    titleTransition: "vt-category-ai-produced",
  },
} as const satisfies Record<
  Section,
  Readonly<{ title: string; description: string; titleTransition: string }>
>;

export const sectionPath = (section: Section): string => `/${section}`;
