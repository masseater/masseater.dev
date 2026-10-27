import type { MDXComponents } from "mdx/types";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry";

import { EntryModule } from "./entry-module";
import type { Render } from "./entry-module";
import { FootnoteRef } from "./footnote-ref";
import { ScrollTable } from "./scroll-table";
import { Speech } from "./speech";

const components: MDXComponents = { FootnoteRef, Speech, table: ScrollTable };

const renderBody: Render = ({ default: Body }) => <Body components={components} />;

const EntryBody = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <EntryModule entry={entry} render={renderBody} />
);

export { EntryBody };
