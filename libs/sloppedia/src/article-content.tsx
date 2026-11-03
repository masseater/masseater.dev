import type { ReactNode } from "react";

import type { Article } from "./article.ts";
import { Infobox } from "./infobox.tsx";

const ArticleContent = ({
  article,
  children,
}: Readonly<{ article: Article; children: ReactNode }>): ReactNode => (
  <div className="mt-4 flow-root">
    <Infobox rows={article.infobox} title={article.title} />
    <div className="wiki-prose">{children}</div>
  </div>
);

export { ArticleContent };
