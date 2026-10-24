import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { categoryMeta, EntryBody } from "#/entities/entry";

import { ArticleHeader } from "./article-header";
import { EntryReactions } from "./entry-reactions";

const route = getRouteApi("/_site/$category/$slug");

const EntryPage = (): ReactNode => {
  const { entry } = route.useLoaderData();
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <ArticleHeader entry={entry} />
      <div className="glass-surface entry-rise prose prose-zinc prose-headings:font-display prose-headings:font-normal prose-headings:tracking-tight prose-a:font-normal prose-a:underline-offset-4 prose-a:decoration-foreground/30 hover:prose-a:decoration-foreground prose-a:transition-colors prose-code:rounded-md prose-code:bg-foreground/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-2xl max-w-none px-6 py-8 leading-loose *:first:mt-0 *:last:mb-0 sm:px-12 sm:py-12">
        <EntryBody entry={entry} />
      </div>
      {categoryMeta[entry.category].reactions && <EntryReactions entry={entry} />}
    </article>
  );
};

export { EntryPage };
