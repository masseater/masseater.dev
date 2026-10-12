import { Option } from "effect";
import type { MDXContent, MDXModule } from "mdx/types";
import { lazy } from "react";
import type { LazyExoticComponent } from "react";

import { contentPath } from "./content";
import type { Entry } from "./entry";

const bodies = new Map(
  Object.entries(import.meta.glob<MDXModule>("/content/*/*.md")).map(([path, load]) => [
    path,
    lazy(load),
  ]),
);

const findBody = (
  location: Readonly<Pick<Entry, "category" | "slug">>,
): Option.Option<LazyExoticComponent<MDXContent>> =>
  Option.fromUndefinedOr(bodies.get(contentPath(location)));

export { findBody };
