import { Array as Arr } from "effect";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry.ts";
import { tocOf } from "#/entities/entry/model/toc.ts";

import { EntryModule } from "./entry-module.tsx";
import type { Render } from "./entry-module.tsx";
import { TocList } from "./toc-list.tsx";

const LABEL = "目次";

const renderToc: Render = (module) => {
  const headings = tocOf(module);
  return (
    Arr.isReadonlyArrayNonEmpty(headings) && (
      <nav
        aria-label={LABEL}
        className="glass-surface flex flex-col gap-4 p-6 text-sm leading-relaxed"
      >
        <p className="font-display text-foreground text-xs tracking-widest">{LABEL}</p>
        <TocList headings={headings} />
      </nav>
    )
  );
};

export const EntryToc = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <EntryModule entry={entry} render={renderToc} />
);
