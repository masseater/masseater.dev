import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry";
import { tocOf } from "#/entities/entry/model/toc";
import type { Heading } from "#/entities/entry/model/toc";

import { EntryModule } from "./entry-module";
import type { Render } from "./entry-module";

type RenderHeadings = (headings: readonly Heading[]) => ReactNode;

const withHeadings =
  (render: RenderHeadings): Render =>
  (module) =>
    render(tocOf(module));

const EntryHeadings = ({
  entry,
  render,
}: Readonly<{ entry: Entry; render: RenderHeadings }>): ReactNode => (
  <EntryModule entry={entry} render={withHeadings(render)} />
);

export type { RenderHeadings };
export { EntryHeadings };
