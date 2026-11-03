import { Array as Arr } from "effect";
import type { ReactNode } from "react";

import { EntryHeadings } from "#/entities/entry";
import type { Entry, Heading } from "#/entities/entry";

import { SideTocNav } from "./side-toc-nav";

const renderSideToc = (headings: readonly Heading[]): ReactNode =>
  Arr.isReadonlyArrayNonEmpty(headings) && <SideTocNav headings={headings} />;

const SideToc = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <EntryHeadings entry={entry} render={renderSideToc} />
);

export { SideToc };
