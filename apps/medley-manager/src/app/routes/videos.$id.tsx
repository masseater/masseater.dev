import { createFileRoute } from "@tanstack/react-router";

import { VideoPage, loadVideoPage } from "#/pages/video/index.ts";
import { idParams } from "#/shared/lib/id-params.ts";

export const Route = createFileRoute("/videos/$id")({
  params: idParams,
  loader: ({ context, params }) =>
    loadVideoPage({ queryClient: context.queryClient, id: params.id }),
  component: VideoPage,
});
