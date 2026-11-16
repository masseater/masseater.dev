import { categoryMeta } from "#/entities/entry/index.ts";
import type { Head } from "#/shared/lib/index.ts";

export const wikiLayoutHead: Head = {
  meta: [{ name: "robots", content: categoryMeta.sloppedia.robots }],
  links: [],
  scripts: [],
};
