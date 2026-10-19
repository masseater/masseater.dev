import type { Entry } from "#/entities/entry/model/entry";

const transitionName = (
  part: "title" | "meta",
  { category, slug }: Readonly<Pick<Entry, "category" | "slug">>,
): string => `entry-${part}-${category}-${slug}`.replaceAll(/[^\w-]/gu, "_");

const entryTitleTransition = (entry: Readonly<Pick<Entry, "category" | "slug">>): string =>
  transitionName("title", entry);

const entryMetaTransition = (entry: Readonly<Pick<Entry, "category" | "slug">>): string =>
  transitionName("meta", entry);

export { entryMetaTransition, entryTitleTransition };
