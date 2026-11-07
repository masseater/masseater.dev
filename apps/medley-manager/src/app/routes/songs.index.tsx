import { createFileRoute } from "@tanstack/react-router";
import { Schema } from "effect";

import { SongsPage, loadSongsPage } from "#/pages/songs";
import { TextSearch } from "#/shared/lib/text-search";

const Route = createFileRoute("/songs/")({
  validateSearch: Schema.toStandardSchemaV1(TextSearch),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => loadSongsPage({ queryClient: context.queryClient, filter: deps }),
  component: SongsPage,
});

export { Route };
