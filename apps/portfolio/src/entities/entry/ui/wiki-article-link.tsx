import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry";

const WikiArticleLink = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <Link className="text-wiki-link hover:underline" params={entry} to="/sloppedia/$slug">
    {entry.title}
  </Link>
);

export { WikiArticleLink };
