import mdx from "@mdx-js/rollup";
import rehypeShiki from "@shikijs/rehype";
import rehypeExtractToc from "@stefanprobst/rehype-extract-toc";
import rehypeExportToc from "@stefanprobst/rehype-extract-toc/mdx";
import rehypeSlug from "rehype-slug";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";

import { rehypeFootnotePreview } from "./rehype-footnote-preview.ts";
import { remarkGitDate } from "./remark-git-date.ts";

export default {
  enforce: "pre",
  ...mdx({
    remarkPlugins: [remarkFrontmatter, remarkGitDate, remarkMdxFrontmatter, remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      rehypeExtractToc,
      rehypeExportToc,
      [rehypeShiki, { theme: "github-light" }],
      rehypeFootnotePreview,
    ],
    remarkRehypeOptions: {
      footnoteLabel: "出典",
      footnoteLabelProperties: {},
      footnoteBackLabel: "本文に戻る",
    },
  }),
} as const;
