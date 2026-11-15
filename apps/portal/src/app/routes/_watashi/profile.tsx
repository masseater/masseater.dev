import { createFileRoute } from "@tanstack/react-router";

import { ProfilePage, loadProfilePage } from "#/pages/profile";

const Route = createFileRoute("/_watashi/profile")({
  loader: ({ context }) => loadProfilePage(context.queryClient),
  component: ProfilePage,
});

export { Route };
