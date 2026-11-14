import type { ReactNode } from "react";

import { IngestForm } from "#/entities/source";

import { IngestedList } from "./ingested-list.tsx";
import { SettingRoutes } from "./setting-routes.tsx";

const SettingBody = (): ReactNode => (
  <div className="flex min-w-0 grow flex-col gap-5">
    <IngestForm />
    <IngestedList />
    <SettingRoutes />
  </div>
);

export { SettingBody };
