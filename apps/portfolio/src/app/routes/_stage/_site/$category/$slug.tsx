import { createFileRoute } from "@tanstack/react-router";

import { entryHead, EntryPage, loadEntry } from "#/pages/entry";

export const Route = createFileRoute("/_stage/_site/$category/$slug")({
  loader: ({ params }) => loadEntry(params),
  head: ({ loaderData }) => entryHead(loaderData),
  component: EntryPage,
});
