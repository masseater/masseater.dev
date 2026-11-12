import type { ReactNode } from "react";

import { useSources } from "#/pages/sources/api/sources.ts";
import { AppHeader } from "#/shared/ui";

import { IngestForm } from "./ingest-form.tsx";
import { McpSetting } from "./mcp-setting.tsx";
import { SourceRow } from "./source-row.tsx";

const SourcesPage = (): ReactNode => {
  const sources = useSources();
  return (
    <div className="flex h-screen flex-col">
      <AppHeader />
      <div className="flex min-h-0 grow">
        <main className="min-w-0 grow overflow-y-auto px-14 py-8">
          <h2 className="mb-2 text-sm font-bold">取り込んだ資料</h2>
          <ul aria-label="取り込んだ資料">
            {sources.map((source) => (
              <SourceRow key={source.id} source={source} />
            ))}
          </ul>
        </main>
        <aside className="flex w-[21.25rem] shrink-0 flex-col gap-7 border-l px-6 py-8">
          <IngestForm />
          <McpSetting />
        </aside>
      </div>
    </div>
  );
};

export { SourcesPage };
