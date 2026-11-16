import { createFileRoute } from "@tanstack/react-router";

import { SongPage, loadSongPage } from "#/pages/song/index.ts";
import { idParams } from "#/shared/lib/id-params.ts";

export const Route = createFileRoute("/songs/$id")({
  params: idParams,
  loader: ({ context, params }) =>
    loadSongPage({ queryClient: context.queryClient, id: params.id }),
  component: SongPage,
});
