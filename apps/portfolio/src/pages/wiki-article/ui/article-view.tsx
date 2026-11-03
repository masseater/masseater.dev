import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry";

import { ArticleAside } from "./article-aside";
import { ArticleMain } from "./article-main";

const ArticleView = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <div className="mx-auto flex w-full max-w-7xl gap-8 px-4 py-6">
    <ArticleAside entry={entry} />
    <ArticleMain entry={entry} />
  </div>
);

export { ArticleView };
