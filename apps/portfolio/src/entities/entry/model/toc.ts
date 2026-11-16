import { headingsOf } from "@masseater.dev/sloppedia";
import type { Heading } from "@masseater.dev/sloppedia";
import { Array as Arr, Option } from "effect";
import type { MDXModule } from "mdx/types";

import { findLoadedBody } from "./body.ts";
import type { Entry } from "./entry.ts";

export const tocOf = ({ tableOfContents }: Readonly<MDXModule>): readonly Heading[] =>
  headingsOf(tableOfContents);

export const loadedHeadings = (
  entry: Readonly<Pick<Entry, "category" | "slug">>,
): readonly Heading[] => Option.match(findLoadedBody(entry), { onNone: Arr.empty, onSome: tocOf });
