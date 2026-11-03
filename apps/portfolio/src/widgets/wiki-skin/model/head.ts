import { categoryMeta } from "#/entities/entry";
import type { Head } from "#/shared/lib";

const wikiLayoutHead: Head = {
  meta: [{ name: "robots", content: categoryMeta.sloppedia.robots }],
  links: [],
  scripts: [],
};

export { wikiLayoutHead };
