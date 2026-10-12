import { Option } from "effect";

import { entryPath } from "#/entities/entry";
import type { FoundEntry } from "#/pages/entry/api/load-entry";
import { notFoundHead, pageTitle, seo } from "#/shared/lib";
import type { Head } from "#/shared/lib";

const entryHead = (loaded: FoundEntry | undefined): Head =>
  Option.match(Option.fromUndefinedOr(loaded), {
    onNone: () => notFoundHead,
    onSome: ({ entry }) =>
      seo({
        title: pageTitle(entry.title),
        description: entry.description,
        path: entryPath(entry),
        type: "article",
      }),
  });

export { entryHead };
