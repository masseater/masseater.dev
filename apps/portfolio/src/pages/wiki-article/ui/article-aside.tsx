import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry";

import { SideToc } from "./side-toc";

const ArticleAside = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <aside className="hidden w-56 shrink-0 lg:block">
    <div className="sticky top-4">
      <SideToc entry={entry} />
    </div>
  </aside>
);

export { ArticleAside };
