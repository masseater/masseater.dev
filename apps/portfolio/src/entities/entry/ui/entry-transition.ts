import { String as Str } from "effect";

import type { Entry } from "#/entities/entry/model/entry.ts";

const transitionName = (
  part: "title" | "meta",
  { category, slug }: Readonly<Pick<Entry, "category" | "slug">>,
): string => Str.replaceAll(/[^\w-]/gu, "_")(`entry-${part}-${category}-${slug}`);

export const entryTitleTransition = (entry: Readonly<Pick<Entry, "category" | "slug">>): string =>
  transitionName("title", entry);

export const entryMetaTransition = (entry: Readonly<Pick<Entry, "category" | "slug">>): string =>
  transitionName("meta", entry);
