import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { tagsOf } from "#/entities/slides";
import type { DeckValue } from "#/entities/slides";

import { TagItem } from "./tag-item";

const TEXT = { label: "タグで絞る", all: "すべて" } as const;

const EVERY = Option.none<string>();

export const TagFilter = ({
  decks,
  tag,
}: Readonly<{ decks: readonly DeckValue[]; tag: Option.Option<string> }>): ReactNode => (
  <nav aria-label={TEXT.label}>
    <ul className="font-display flex flex-wrap gap-2 text-xs tracking-widest">
      <TagItem active={Option.isNone(tag)} label={TEXT.all} tag={EVERY} />
      {pipe(
        tagsOf(decks),
        Arr.map((value) => (
          <TagItem
            active={Option.contains(tag, value)}
            key={value}
            label={value}
            tag={Option.some(value)}
          />
        )),
      )}
    </ul>
  </nav>
);
