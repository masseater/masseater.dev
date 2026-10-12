import { createFileRoute } from "@tanstack/react-router";
import { Effect } from "effect";

import { allEntries } from "#/entities/entry";
import { homeHead, HomePage } from "#/pages/home";

const Route = createFileRoute("/")({
  loader: () => Effect.runPromise(allEntries),
  head: () => homeHead,
  component: HomePage,
});

export { Route };
