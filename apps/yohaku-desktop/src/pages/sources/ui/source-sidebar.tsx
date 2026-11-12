import type { ReactNode } from "react";

import { IngestForm } from "./ingest-form.tsx";
import { McpSetting } from "./mcp-setting.tsx";

const SourceSidebar = (): ReactNode => (
  <aside className="flex w-85 shrink-0 flex-col gap-7 border-l px-6 py-8">
    <IngestForm />
    <McpSetting />
  </aside>
);

export { SourceSidebar };
