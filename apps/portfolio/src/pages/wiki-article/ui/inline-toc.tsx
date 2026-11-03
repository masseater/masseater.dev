import { Array as Arr } from "effect";
import type { ReactNode } from "react";

import { EntryHeadings } from "#/entities/entry";
import type { Entry, Heading } from "#/entities/entry";

import { InlineTocBox } from "./inline-toc-box";

const renderInlineToc = (headings: readonly Heading[]): ReactNode =>
  Arr.isReadonlyArrayNonEmpty(headings) && <InlineTocBox headings={headings} />;

const InlineToc = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <EntryHeadings entry={entry} render={renderInlineToc} />
);

export { InlineToc };
