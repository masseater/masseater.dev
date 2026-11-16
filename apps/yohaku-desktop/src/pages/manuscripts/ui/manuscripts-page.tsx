import type { ReactNode } from "react";

import { ScreenFrame } from "#/shared/ui/index.ts";

import { ManuscriptList } from "./manuscript-list.tsx";
import { ManuscriptsToolbar } from "./manuscripts-toolbar.tsx";

export const ManuscriptsPage = (): ReactNode => (
  <ScreenFrame>
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 overflow-y-auto px-6 py-10">
      <ManuscriptsToolbar />
      <ManuscriptList />
    </main>
  </ScreenFrame>
);
