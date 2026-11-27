import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { categoryMeta } from "#/entities/entry/index.ts";
import type { Entry } from "#/entities/entry/index.ts";
import { StarButton } from "#/features/star-songs/index.ts";

import { EntryProse } from "./entry-prose.tsx";

const AUTHOR_LABEL = "AI（Claude）が書いた文章";

export const FeedEntryPage = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <article className="mx-auto flex w-full max-w-2xl flex-col gap-8">
    <div className="border-foreground/40 font-display flex items-center justify-between gap-4 border px-3 py-2 text-xs tracking-widest">
      <span>{`${categoryMeta[entry.category].title}　${AUTHOR_LABEL}`}</span>
      <time dateTime={entry.date}>{entry.date}</time>
    </div>
    <h1 className="font-display text-4xl leading-tight font-light text-balance sm:text-5xl">
      {entry.title}
    </h1>
    <EntryProse entry={entry} />
    <footer className="border-foreground/10 text-foreground/60 font-display flex items-center justify-between border-t pt-4 text-xs tracking-widest">
      <Link params={entry} to="/$category">
        {`← ${categoryMeta[entry.category].title}`}
      </Link>
      <StarButton entry={entry} />
    </footer>
  </article>
);
