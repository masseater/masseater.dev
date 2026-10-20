import { Option } from "effect";
import type { MDXModule } from "mdx/types";
import { Suspense, use } from "react";
import type { ReactNode } from "react";

import { findBody, findLoadedBody } from "#/entities/entry/model/body";
import type { Entry } from "#/entities/entry/model/entry";

const LoadedBody = ({ load }: Readonly<{ load: () => Promise<MDXModule> }>): ReactNode => {
  const { default: Body } = use(load());
  return <Body />;
};

const PendingBody = ({ entry }: Readonly<{ entry: Entry }>): ReactNode =>
  Option.match(findBody(entry), {
    onNone: () => false,
    onSome: (load) => (
      <Suspense>
        <LoadedBody load={load} />
      </Suspense>
    ),
  });

const EntryBody = ({ entry }: Readonly<{ entry: Entry }>): ReactNode =>
  Option.match(findLoadedBody(entry), {
    onNone: () => <PendingBody entry={entry} />,
    onSome: ({ default: Body }) => <Body />,
  });

export { EntryBody };
