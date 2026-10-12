import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { EntryBody } from "#/entities/entry";

import { ArticleHeader } from "./article-header";

const route = getRouteApi("/_site/$category/$slug");

const EntryPage = (): ReactNode => {
  const { entry } = route.useLoaderData();
  return (
    <article className="flex flex-col gap-8">
      <ArticleHeader entry={entry} />
      <div className="prose prose-zinc prose-code:before:content-none prose-code:after:content-none max-w-none">
        <EntryBody entry={entry} />
      </div>
    </article>
  );
};

export { EntryPage };
