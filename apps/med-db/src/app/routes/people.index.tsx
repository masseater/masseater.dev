import { createFileRoute } from "@tanstack/react-router";
import { Schema } from "effect";

import { PeoplePage, loadPeoplePage } from "#/pages/people/index.ts";
import { TextSearch } from "#/shared/lib/text-search.ts";

export const Route = createFileRoute("/people/")({
  validateSearch: Schema.toStandardSchemaV1(TextSearch),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => loadPeoplePage({ queryClient: context.queryClient, filter: deps }),
  component: PeoplePage,
});
