import { Option } from "effect";
import { Suspense } from "react";
import type { ReactNode } from "react";

import { findBody } from "#/entities/entry/model/body";
import type { Entry } from "#/entities/entry/model/entry";

const EntryBody = ({ entry }: Readonly<{ entry: Entry }>): ReactNode =>
  Option.match(findBody(entry), {
    onNone: () => false,
    onSome: (Body) => (
      <Suspense>
        <Body />
      </Suspense>
    ),
  });

export { EntryBody };
