import { Option } from "effect";
import type { MDXContent, MDXModule } from "mdx/types";
import { lazy } from "react";
import type { LazyExoticComponent } from "react";

import type { Entry } from "./entry";

const bodies = new Map(
  Object.entries(import.meta.glob<MDXModule>("/content/*/*.md")).map(([path, load]) => [
    path,
    lazy(load),
  ]),
);

const findBody = ({
  category,
  slug,
}: Readonly<Pick<Entry, "category" | "slug">>): Option.Option<LazyExoticComponent<MDXContent>> =>
  Option.fromUndefinedOr(bodies.get(`/content/${category}/${slug}.md`));

export { findBody };
