import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { categoryMeta } from "#/entities/entry";

import { EntryColumn } from "./entry-column";
import { EntryOutline } from "./entry-outline";
import { EntrySide } from "./entry-side";

const route = getRouteApi("/_site/$category/$slug");

const EntryPage = (): ReactNode => {
  const { entry } = route.useLoaderData();
  return (
    <article className="flex w-full justify-center gap-8" data-wide>
      {categoryMeta[entry.category].reactions && <EntrySide entry={entry} />}
      <EntryColumn entry={entry} />
      <EntryOutline entry={entry} />
    </article>
  );
};

export { EntryPage };
