import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { tagsOf } from "#/entities/slide/index.ts";
import type { DeckValue } from "#/entities/slide/index.ts";

import { TagItem } from "./tag-item.tsx";

const TEXT = { label: "タグで絞る", all: "すべて" } as const;

const EVERY = Option.none<string>();

export const TagFilter = ({
  decks,
  tag,
}: Readonly<{ decks: readonly DeckValue[]; tag: Option.Option<string> }>): ReactNode => (
  <nav aria-label={TEXT.label}>
    <ul className="flex flex-wrap gap-2 text-xs">
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
