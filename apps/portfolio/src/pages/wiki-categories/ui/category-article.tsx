import type { ReactNode } from "react";

import { WikiArticleLink } from "#/entities/entry";
import type { Entry } from "#/entities/entry";

const CategoryArticle = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <li>
    <WikiArticleLink entry={entry} />
  </li>
);

export { CategoryArticle };
