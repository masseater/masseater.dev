import type { MDXComponents } from "mdx/types";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry";

import { EntryModule } from "./entry-module";
import type { Render } from "./entry-module";
import { FootnoteRef } from "./footnote-ref";
import { LazyImage } from "./lazy-image";
import { ScrollTable } from "./scroll-table";
import { Speech } from "./speech";
import { YouTube } from "./you-tube";

const components: MDXComponents = {
  FootnoteRef,
  Speech,
  YouTube,
  img: LazyImage,
  table: ScrollTable,
};

const renderBody: Render = ({ default: Body }) => <Body components={components} />;

const EntryBody = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <EntryModule entry={entry} render={renderBody} />
);

export { EntryBody };
