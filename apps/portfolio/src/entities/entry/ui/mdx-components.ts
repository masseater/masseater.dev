import type { MDXComponents } from "mdx/types";

import { Figure } from "./figure.tsx";
import { FootnoteRef } from "./footnote-ref.tsx";
import { LazyImage } from "./lazy-image.tsx";
import { ScrollTable } from "./scroll-table.tsx";
import { Speech } from "./speech.tsx";
import { WikiLink } from "./wiki-link.tsx";
import { YouTube } from "./you-tube.tsx";

export const components: MDXComponents = {
  Figure,
  FootnoteRef,
  Speech,
  WikiLink,
  YouTube,
  img: LazyImage,
  table: ScrollTable,
};
