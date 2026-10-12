import type { ReactNode } from "react";

import { NotFound } from "#/widgets/not-found";

const RootNotFound = (): ReactNode => (
  <main className="mx-auto w-full max-w-3xl px-4 py-10">
    <NotFound />
  </main>
);

export { RootNotFound };
