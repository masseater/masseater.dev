import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { EntryBody, entryQueries } from "#/entities/entry";
import { NotFound } from "#/widgets/not-found";

import { ArticleHeader } from "./article-header";

const route = getRouteApi("/$category/$slug");

const EntryPage = (): ReactNode => {
  const { category, slug } = route.useParams();
  const { data } = useSuspenseQuery(entryQueries.detail(category, slug));
  if (data.status === "missing") {
    return <NotFound />;
  }
  return (
    <article className="flex flex-col gap-8">
      <ArticleHeader entry={data.entry} />
      <div className="prose prose-zinc prose-code:before:content-none prose-code:after:content-none max-w-none">
        <EntryBody entry={data.entry} />
      </div>
    </article>
  );
};

export { EntryPage };
