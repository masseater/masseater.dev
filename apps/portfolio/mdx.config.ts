import mdx from "@mdx-js/rollup";
import rehypeShiki from "@shikijs/rehype";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";

import { remarkGitDate } from "./remark-git-date.ts";

export default {
  enforce: "pre",
  ...mdx({
    remarkPlugins: [remarkFrontmatter, remarkGitDate, remarkMdxFrontmatter, remarkGfm],
    rehypePlugins: [[rehypeShiki, { theme: "github-light" }]],
    remarkRehypeOptions: {
      footnoteLabel: "出典",
      footnoteLabelProperties: {},
      footnoteBackLabel: "本文に戻る",
    },
  }),
} as const;
