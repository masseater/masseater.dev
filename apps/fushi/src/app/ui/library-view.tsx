import { useAtomValue } from "@effect/atom-react";
import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { useBaselines } from "#/entities/library/index.ts";
import type { Library } from "#/entities/library/index.ts";
import { routeAtom } from "#/shared/lib/index.ts";

import { StartShell } from "./start-shell.tsx";
import { StyleShell } from "./style-shell.tsx";

export const LibraryView = ({ library }: Readonly<{ library: Library }>): ReactNode => {
  const route = useAtomValue(routeAtom);
  const baselines = useBaselines();
  return pipe(
    Option.liftPredicate(route, (each) => each.page !== "styles"),
    Option.flatMap((each) =>
      Arr.findFirst(library.styles, (style) => "style" in each && style.id === each.style),
    ),
    Option.match({
      onNone: () => <StartShell library={library} baselines={baselines} />,
      onSome: (style) => (
        <StyleShell library={library} current={style} route={route} baselines={baselines} />
      ),
    }),
  );
};
