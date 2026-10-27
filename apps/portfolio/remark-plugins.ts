import remarkDirective from "remark-directive";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";

import { remarkDialogue } from "./remark-dialogue.ts";
import { remarkGitDate } from "./remark-git-date.ts";
import { remarkYouTube } from "./remark-youtube.ts";

const remarkPlugins = [
  remarkFrontmatter,
  remarkGitDate,
  remarkMdxFrontmatter,
  remarkGfm,
  remarkDirective,
  remarkYouTube,
  remarkDialogue,
] as const;

export { remarkPlugins };
