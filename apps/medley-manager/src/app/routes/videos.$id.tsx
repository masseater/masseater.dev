import { createFileRoute } from "@tanstack/react-router";

import { VideoPage, loadVideoPage } from "#/pages/video";
import { idParams } from "#/shared/lib/id-params";

const Route = createFileRoute("/videos/$id")({
  params: idParams,
  loader: ({ context, params }) =>
    loadVideoPage({ queryClient: context.queryClient, id: params.id }),
  component: VideoPage,
});

export { Route };
