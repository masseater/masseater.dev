import { Match } from "effect";
import type { ReactNode } from "react";

import { useLibrary } from "#/entities/library/index.ts";
import type { Library } from "#/entities/library/index.ts";
import type { Loaded } from "#/shared/lib/index.ts";
import { Failure } from "#/shared/ui/index.ts";

import { LibraryView } from "./library-view.tsx";

const shown = Match.type<Loaded<Library>>().pipe(
  Match.discriminatorsExhaustive("status")({
    loading: (): ReactNode => [],
    failed: ({ message }): ReactNode => <Failure>{message}</Failure>,
    ready: ({ value }): ReactNode => <LibraryView library={value} />,
  }),
);

export const App = (): ReactNode => shown(useLibrary());
