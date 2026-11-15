import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArticleView } from "sloppedia";

import { EntryBody } from "#/entities/entry/index.ts";
import { wiki } from "#/shared/wiki/index.ts";

const route = getRouteApi("/sloppedia/$slug");

export const ArticlePage = (): ReactNode => {
  const { entry, headings } = route.useLoaderData();
  return (
    <ArticleView article={entry} config={wiki} headings={headings}>
      <EntryBody entry={entry} />
    </ArticleView>
  );
};
