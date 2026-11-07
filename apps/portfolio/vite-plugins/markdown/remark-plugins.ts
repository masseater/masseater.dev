import remarkDirective from "remark-directive";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";

import { remarkDialogue } from "./remark-dialogue.ts";
import { remarkFigure } from "./remark-figure.ts";
import { remarkGitDate } from "./remark-git-date.ts";
import { remarkWikiLink } from "./remark-wiki-link.ts";
import { remarkYouTube } from "./remark-youtube.ts";

const remarkPlugins = [
  remarkFrontmatter,
  remarkGitDate,
  remarkMdxFrontmatter,
  remarkGfm,
  remarkWikiLink,
  remarkDirective,
  remarkYouTube,
  remarkFigure,
  remarkDialogue,
] as const;

export { remarkPlugins };
