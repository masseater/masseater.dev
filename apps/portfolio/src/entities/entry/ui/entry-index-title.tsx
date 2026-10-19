import { toWavyLetters, WavyLetters } from "@masseater.dev/ui";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry";

import { entryTitleTransition } from "./entry-transition";

const EntryIndexTitle = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <span
    aria-label={entry.title}
    className="vt-attr stage-title entry-index-title font-display inline-block self-start select-none"
    data-vt={entryTitleTransition(entry)}
  >
    <WavyLetters letters={toWavyLetters(entry.title)} />
  </span>
);

export { EntryIndexTitle };
