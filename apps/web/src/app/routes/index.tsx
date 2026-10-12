import { createFileRoute } from "@tanstack/react-router";

import { entryQueries } from "#/entities/entry";
import { homeHead, HomePage } from "#/pages/home";

const Route = createFileRoute("/")({
  loader: ({ context: { queryClient } }) => queryClient.query(entryQueries.all()),
  head: () => homeHead,
  component: HomePage,
});

export { Route };
