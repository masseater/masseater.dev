import { createFileRoute } from "@tanstack/react-router";
import { Schema } from "effect";

import { SongsPage, loadSongsPage } from "#/pages/songs/index.ts";
import { TextSearch } from "#/shared/lib/text-search.ts";

export const Route = createFileRoute("/songs/")({
  validateSearch: Schema.toStandardSchemaV1(TextSearch),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => loadSongsPage({ queryClient: context.queryClient, filter: deps }),
  component: SongsPage,
});
