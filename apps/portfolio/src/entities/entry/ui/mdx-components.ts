import type { MDXComponents } from "mdx/types";

import { Figure } from "./figure";
import { FootnoteRef } from "./footnote-ref";
import { LazyImage } from "./lazy-image";
import { ScrollTable } from "./scroll-table";
import { Speech } from "./speech";
import { WikiLink } from "./wiki-link";
import { YouTube } from "./you-tube";

export const components: MDXComponents = {
  Figure,
  FootnoteRef,
  Speech,
  WikiLink,
  YouTube,
  img: LazyImage,
  table: ScrollTable,
};
