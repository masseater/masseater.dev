import { Option } from "effect";
import type { MDXModule } from "mdx/types";
import { Suspense, use } from "react";
import type { ReactNode } from "react";

import { findBody, findLoadedBody } from "#/entities/entry/model/body.ts";
import type { Entry } from "#/entities/entry/model/entry.ts";

export type Render = (module: Readonly<MDXModule>) => ReactNode;

const LoadedModule = ({
  entry,
  load,
  render,
}: Readonly<{ entry: Entry; load: () => Promise<MDXModule>; render: Render }>): ReactNode =>
  render(Option.getOrElse(findLoadedBody(entry), () => use(load())));

export const EntryModule = ({
  entry,
  render,
}: Readonly<{ entry: Entry; render: Render }>): ReactNode =>
  Option.match(findBody(entry), {
    onNone: () => false,
    onSome: (load) => (
      <Suspense>
        <LoadedModule entry={entry} load={load} render={render} />
      </Suspense>
    ),
  });
