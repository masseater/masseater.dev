import { createFileRoute } from "@tanstack/react-router";

import { loadSong, songHead, SongPage } from "#/pages/ai-produced-song/index.ts";

export const Route = createFileRoute("/ai-produced/$slug")({
  loader: ({ params }) => loadSong(params),
  head: ({ loaderData }) => songHead(loaderData),
  component: SongPage,
});
