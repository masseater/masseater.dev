import { createFileRoute } from "@tanstack/react-router";
import { Schema } from "effect";

import { ProfileSearch } from "#/entities/watashi";
import { ProfilePage, loadProfilePage } from "#/pages/profile";

export const Route = createFileRoute("/profile")({
  validateSearch: Schema.toStandardSchemaV1(ProfileSearch),
  loader: ({ context }) => loadProfilePage(context.queryClient),
  component: ProfilePage,
});
