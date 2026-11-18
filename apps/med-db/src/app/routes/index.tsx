import { createFileRoute } from "@tanstack/react-router";

import { HomePage, loadHomePage } from "#/pages/home/index.ts";

export const Route = createFileRoute("/")({
  loader: ({ context }) => loadHomePage(context.queryClient),
  component: HomePage,
});
