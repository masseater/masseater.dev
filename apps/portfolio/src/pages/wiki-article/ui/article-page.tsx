import { ArticleView } from "@masseater.dev/sloppedia";
import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

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
