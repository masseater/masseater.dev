import { createFileRoute } from "@tanstack/react-router";

import {
  CreditsFrame,
  CreditsPage,
  creditedTiles,
  creditsHead,
  creditsSearch,
} from "#/pages/credits";
import { bundledPreview } from "#/pages/mosaic";

const Route = createFileRoute("/$slug_/credits")({
  validateSearch: creditsSearch,
  ssr: false,
  loaderDeps: ({ search }) => search,
  loader: ({ params, deps }) => creditedTiles({ slug: params.slug, seed: deps.seed }),
  head: ({ params }) =>
    creditsHead({ slug: params.slug, mosaic: bundledPreview(params.slug).card }),
  pendingComponent: CreditsFrame,
  component: CreditsPage,
});

export { Route };
