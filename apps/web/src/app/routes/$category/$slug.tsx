import { createFileRoute } from "@tanstack/react-router";

import { entryHead, EntryPage, loadEntry } from "#/pages/entry";

const Route = createFileRoute("/$category/$slug")({
  loader: ({ params }) => loadEntry(params),
  head: ({ loaderData }) => entryHead(loaderData),
  component: EntryPage,
});

export { Route };
