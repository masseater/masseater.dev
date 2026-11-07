import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry";

import { EntryModule } from "./entry-module";
import type { Render } from "./entry-module";
import { components } from "./mdx-components";

const renderBody: Render = ({ default: Body }) => <Body components={components} />;

const EntryBody = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <EntryModule entry={entry} render={renderBody} />
);

export { EntryBody };
