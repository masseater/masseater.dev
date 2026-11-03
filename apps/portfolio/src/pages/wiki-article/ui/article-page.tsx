import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { ArticleView } from "./article-view";

const route = getRouteApi("/sloppedia/$slug");

const ArticlePage = (): ReactNode => {
  const { entry } = route.useLoaderData();
  return <ArticleView entry={entry} />;
};

export { ArticlePage };
