import { createFileRoute, Outlet } from "@tanstack/react-router";

import { WatashiLayout } from "#/app/shell/watashi-layout";

const Route = createFileRoute("/_watashi")({
  component: () => (
    <WatashiLayout>
      <Outlet />
    </WatashiLayout>
  ),
});

export { Route };
