import mdx from "@mdx-js/rollup";
import rehypeShiki from "@shikijs/rehype";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";

export default {
  enforce: "pre",
  ...mdx({
    remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter, remarkGfm],
    rehypePlugins: [[rehypeShiki, { theme: "github-light" }]],
  }),
} as const;
