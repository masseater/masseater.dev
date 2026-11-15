import { createFileRoute } from "@tanstack/react-router";

import { MemoPage, loadMemoPage } from "#/pages/memo";

const Route = createFileRoute("/_watashi/memos/$project/$name")({
  loader: ({ context, params }) => loadMemoPage({ queryClient: context.queryClient, key: params }),
  component: MemoPage,
});

export { Route };
