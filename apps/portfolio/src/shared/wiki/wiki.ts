import { portfolio } from "@masseater.dev/ui/portfolio";
import { defineSloppedia, githubSource } from "sloppedia";

import { site } from "#/shared/config";
import { SloppediaLink } from "#/shared/ui";

const wiki = defineSloppedia({
  name: portfolio.sections.sloppedia,
  tagline: "趣味嗜好に偏った個人の百科事典もどき",
  basePath: "/sloppedia",
  home: { label: site.name, href: "/" },
  link: SloppediaLink,
  ...githubSource({
    repository: "https://github.com/masseater/masseater.dev",
    directory: "apps/portfolio/content/sloppedia",
  }),
});

export { wiki };
