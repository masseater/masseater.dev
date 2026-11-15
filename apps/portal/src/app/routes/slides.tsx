import { createFileRoute } from "@tanstack/react-router";
import { Schema } from "effect";

import { SlidesSearch } from "#/entities/slide";
import { SlidesPage, loadSlidesPage } from "#/pages/slides";

export const Route = createFileRoute("/slides")({
  validateSearch: Schema.toStandardSchemaV1(SlidesSearch),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => loadSlidesPage({ queryClient: context.queryClient, search: deps }),
  component: SlidesPage,
});
