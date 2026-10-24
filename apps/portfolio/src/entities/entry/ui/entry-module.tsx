import { Option } from "effect";
import type { MDXModule } from "mdx/types";
import { Suspense, use } from "react";
import type { ReactNode } from "react";

import { findBody, findLoadedBody } from "#/entities/entry/model/body";
import type { Entry } from "#/entities/entry/model/entry";

type Render = (module: Readonly<MDXModule>) => ReactNode;

const LoadedModule = ({
  load,
  render,
}: Readonly<{ load: () => Promise<MDXModule>; render: Render }>): ReactNode => render(use(load()));

const PendingModule = ({ entry, render }: Readonly<{ entry: Entry; render: Render }>): ReactNode =>
  Option.match(findBody(entry), {
    onNone: () => false,
    onSome: (load) => (
      <Suspense>
        <LoadedModule load={load} render={render} />
      </Suspense>
    ),
  });

const EntryModule = ({ entry, render }: Readonly<{ entry: Entry; render: Render }>): ReactNode =>
  Option.match(findLoadedBody(entry), {
    onNone: () => <PendingModule entry={entry} render={render} />,
    onSome: render,
  });

export type { Render };
export { EntryModule };
