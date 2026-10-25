import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { EntryColumn } from "./entry-column";
import { EntryOutline } from "./entry-outline";
import { EntrySide } from "./entry-side";
import { EntryTitleBar } from "./entry-title-bar";

const route = getRouteApi("/_site/$category/$slug");

const EntryPage = (): ReactNode => {
  const { entry } = route.useLoaderData();
  return (
    <article className="entry-title-scope flex w-full justify-center gap-8" data-wide>
      <EntryTitleBar entry={entry} />
      <EntrySide entry={entry} />
      <EntryColumn entry={entry} />
      <EntryOutline entry={entry} />
    </article>
  );
};

export { EntryPage };
