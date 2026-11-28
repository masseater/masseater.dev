import { createFileRoute } from "@tanstack/react-router";

import { validateTagSearch } from "#/features/filter-by-tag/index.ts";
import { loadShelf, sashiHead, SashiPage } from "#/pages/sashi/index.ts";

export const Route = createFileRoute("/_stage/_site/sashi")({
  validateSearch: validateTagSearch,
  loader: loadShelf,
  head: sashiHead,
  component: SashiPage,
});
