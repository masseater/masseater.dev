import type { ReactNode } from "react";

import { ImportBar } from "#/features/import-songs/index.ts";

import { PendingImports } from "./pending-imports.tsx";
import { SongList } from "./song-list.tsx";

export const Sidebar = (): ReactNode => (
  <aside className="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto border-r p-3">
    <ImportBar />
    <PendingImports />
    <SongList />
  </aside>
);
