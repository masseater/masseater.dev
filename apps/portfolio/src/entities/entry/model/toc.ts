import { Array as Arr, Option } from "effect";
import type { MDXModule } from "mdx/types";
import { headingsOf } from "sloppedia";
import type { Heading } from "sloppedia";

import { findLoadedBody } from "./body";
import type { Entry } from "./entry";

const tocOf = ({ tableOfContents }: Readonly<MDXModule>): readonly Heading[] =>
  headingsOf(tableOfContents);

const loadedHeadings = (entry: Readonly<Pick<Entry, "category" | "slug">>): readonly Heading[] =>
  Option.match(findLoadedBody(entry), { onNone: Arr.empty, onSome: tocOf });

export { loadedHeadings, tocOf };
