import { String as Str, pipe } from "effect";

import type { Entry } from "./entry.ts";

const CONTENT_ROOT = "/content/";
const EXTENSION = ".md";

export const contentPath = ({
  category,
  slug,
}: Readonly<Pick<Entry, "category" | "slug">>): string =>
  `${CONTENT_ROOT}${category}/${slug}${EXTENSION}`;

export const contentLocation = (path: string): readonly string[] =>
  pipe(path, Str.slice(CONTENT_ROOT.length, -EXTENSION.length), Str.split("/"));
