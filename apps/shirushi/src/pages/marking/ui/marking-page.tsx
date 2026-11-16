import type { ReactNode } from "react";

import { LinkBar } from "#/features/load-song/index.ts";

import { MarkingBody } from "./marking-body.tsx";

export const MarkingPage = (): ReactNode => (
  <main className="mx-auto grid max-w-6xl gap-5 px-4 py-5">
    <LinkBar />
    <MarkingBody />
  </main>
);
