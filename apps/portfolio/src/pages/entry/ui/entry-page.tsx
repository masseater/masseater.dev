import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { categoryMeta } from "#/entities/entry/index.ts";

import { EntryColumn } from "./entry-column.tsx";
import { EntryOutline } from "./entry-outline.tsx";
import { EntrySide } from "./entry-side.tsx";
import { EntryTitleBar } from "./entry-title-bar.tsx";
import { FeedEntryPage } from "./feed-entry-page.tsx";

const route = getRouteApi("/_stage/_site/$category/$slug");

export const EntryPage = (): ReactNode => {
  const { entry } = route.useLoaderData();
  if (categoryMeta[entry.category].layout === "feed") {
    return <FeedEntryPage entry={entry} />;
  }
  return (
    <article className="entry-title-scope flex w-full justify-center gap-8" data-wide>
      <EntryTitleBar entry={entry} />
      <EntrySide entry={entry} />
      <EntryColumn entry={entry} />
      <EntryOutline entry={entry} />
    </article>
  );
};
