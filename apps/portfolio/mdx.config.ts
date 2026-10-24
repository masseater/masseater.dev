import mdx from "@mdx-js/rollup";
import rehypeShiki from "@shikijs/rehype";
import rehypeExtractToc from "@stefanprobst/rehype-extract-toc";
import rehypeExportToc from "@stefanprobst/rehype-extract-toc/mdx";
import rehypeSlug from "rehype-slug";

import { rehypeFootnotePreview } from "./rehype-footnote-preview.ts";
import { remarkPlugins } from "./remark-plugins.ts";

export default {
  enforce: "pre",
  ...mdx({
    remarkPlugins: [...remarkPlugins],
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
