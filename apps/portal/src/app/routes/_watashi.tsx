import { createFileRoute, Outlet } from "@tanstack/react-router";

import { WatashiLayout } from "#/app/shell/watashi-layout";

export const Route = createFileRoute("/_watashi")({
  component: () => (
    <WatashiLayout>
      <Outlet />
    </WatashiLayout>
  ),
});
