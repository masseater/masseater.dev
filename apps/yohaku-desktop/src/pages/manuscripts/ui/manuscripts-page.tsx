import type { ReactNode } from "react";

import { ScreenFrame } from "#/shared/ui";

import { ManuscriptList } from "./manuscript-list.tsx";
import { NewManuscriptButton } from "./new-manuscript-button.tsx";

const ManuscriptsPage = (): ReactNode => (
  <ScreenFrame>
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 overflow-y-auto px-6 py-10">
      <NewManuscriptButton />
      <ManuscriptList />
    </main>
  </ScreenFrame>
);

export { ManuscriptsPage };
