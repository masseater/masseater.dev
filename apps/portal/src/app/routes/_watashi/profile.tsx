import { createFileRoute } from "@tanstack/react-router";

import { ProfilePage, loadProfilePage } from "#/pages/profile";

export const Route = createFileRoute("/_watashi/profile")({
  loader: ({ context }) => loadProfilePage(context.queryClient),
  component: ProfilePage,
});
