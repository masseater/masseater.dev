import { createFileRoute } from "@tanstack/react-router";
import { Schema } from "effect";

import { VideoSearch } from "#/entities/catalog";
import { VideosPage, loadVideosPage } from "#/pages/videos";

const Route = createFileRoute("/videos/")({
  validateSearch: Schema.toStandardSchemaV1(VideoSearch),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => loadVideosPage({ queryClient: context.queryClient, filter: deps }),
  component: VideosPage,
});

export { Route };
