import { Option, pipe } from "effect";
import type { ReactNode } from "react";

import { findLoadedEntry } from "#/entities/entry/api/entries";
import { entryPath } from "#/entities/entry/model/entry";

const WikiLink = ({
  slug,
  hash,
  children,
}: Readonly<{ slug: string; hash?: string; children: ReactNode }>): ReactNode =>
  Option.match(findLoadedEntry({ category: "sloppedia", slug }), {
    onNone: () => (
      <span className="text-wiki-link-new" title="未作成の記事">
        {children}
      </span>
    ),
    onSome: (entry) => (
      <a
        href={pipe(
          Option.fromUndefinedOr(hash),
          Option.match({
            onNone: () => entryPath(entry),
            onSome: (anchor) => `${entryPath(entry)}#${anchor}`,
          }),
        )}
      >
        {children}
      </a>
    ),
  });

export { WikiLink };
