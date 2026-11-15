import { createFileRoute } from "@tanstack/react-router";
import { Schema } from "effect";

import { SlidesSearch } from "#/entities/slide/index.ts";
import { SlidesPage, loadSlidesPage } from "#/pages/slides/index.ts";

export const Route = createFileRoute("/slides")({
  validateSearch: Schema.toStandardSchemaV1(SlidesSearch),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => loadSlidesPage({ queryClient: context.queryClient, search: deps }),
  component: SlidesPage,
});
