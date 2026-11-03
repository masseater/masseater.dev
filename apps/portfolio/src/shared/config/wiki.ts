import { portfolio } from "@masseater.dev/ui/portfolio";

const REPOSITORY = "https://github.com/masseater/masseater.dev";
const CONTENT_DIRECTORY = "apps/portfolio/content/sloppedia";

const wiki = {
  name: portfolio.sections.sloppedia,
  tagline: "趣味嗜好に偏った個人の百科事典もどき",
  sourceOf: (slug: string): string => `${REPOSITORY}/blob/main/${CONTENT_DIRECTORY}/${slug}.md`,
  historyOf: (slug: string): string => `${REPOSITORY}/commits/main/${CONTENT_DIRECTORY}/${slug}.md`,
} as const;

export { wiki };
