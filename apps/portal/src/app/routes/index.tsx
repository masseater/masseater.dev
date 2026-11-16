import { createFileRoute } from "@tanstack/react-router";
import { Schema } from "effect";

import { HomePage, HomeSearch, loadHomePage } from "#/pages/home/index.ts";

export const Route = createFileRoute("/")({
  validateSearch: Schema.toStandardSchemaV1(HomeSearch),
  loader: ({ context }) => loadHomePage(context.queryClient),
  component: HomePage,
});
