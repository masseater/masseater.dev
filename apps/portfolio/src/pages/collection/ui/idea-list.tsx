import type { Array, Option, Record } from "effect";
import type { ReactNode } from "react";

import { EntryList } from "#/entities/entry";
import type { Entry, Layout } from "#/entities/entry";

const IDEA_SUMMARY = "アイデア段階のメモ";

const IdeaList = ({
  ideas,
  layout,
  starCounts,
}: Readonly<{
  ideas: Array.NonEmptyReadonlyArray<Entry>;
  layout: Layout;
  starCounts: Option.Option<Record.ReadonlyRecord<string, number>>;
}>): ReactNode => (
  <details>
    <summary className="text-foreground/50 hover:text-foreground/80 font-display w-fit cursor-pointer text-xs tracking-widest transition-colors">
      {`${IDEA_SUMMARY} (${String(ideas.length)})`}
    </summary>
    <div className="pt-6">
      <EntryList entries={ideas} layout={layout} starCounts={starCounts} />
    </div>
  </details>
);

export { IdeaList };
