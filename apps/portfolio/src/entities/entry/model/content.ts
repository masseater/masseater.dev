import { String as Str, pipe } from "effect";

import type { Entry } from "./entry";

const CONTENT_ROOT = "/content/";
const EXTENSION = ".md";

const contentPath = ({ category, slug }: Readonly<Pick<Entry, "category" | "slug">>): string =>
  `${CONTENT_ROOT}${category}/${slug}${EXTENSION}`;

const contentLocation = (path: string): readonly string[] =>
  pipe(path, Str.slice(CONTENT_ROOT.length, -EXTENSION.length), Str.split("/"));

export { contentLocation, contentPath };
