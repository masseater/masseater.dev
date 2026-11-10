import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArticleView } from "sloppedia";

import { EntryBody } from "#/entities/entry";
import { wiki } from "#/shared/wiki";

const route = getRouteApi("/sloppedia/$slug");

const ArticlePage = (): ReactNode => {
  const { entry, headings } = route.useLoaderData();
  return (
    <ArticleView article={entry} config={wiki} headings={headings}>
      <EntryBody entry={entry} />
    </ArticleView>
  );
};

export { ArticlePage };
