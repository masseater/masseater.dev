import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry.ts";

import { EntryModule } from "./entry-module.tsx";
import type { Render } from "./entry-module.tsx";
import { components } from "./mdx-components.ts";

const renderBody: Render = ({ default: Body }) => <Body components={components} />;

export const EntryBody = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <EntryModule entry={entry} render={renderBody} />
);
