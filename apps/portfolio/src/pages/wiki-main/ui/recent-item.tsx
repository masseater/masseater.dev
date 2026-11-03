import type { ReactNode } from "react";

import { WikiArticleLink } from "#/entities/entry";
import type { Entry } from "#/entities/entry";

const RecentItem = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <li>
    <WikiArticleLink entry={entry} />
  </li>
);

export { RecentItem };
