import { Array as Arr, Match, Option, pipe } from "effect";
import type { ReactNode } from "react";

import type { Library, Style } from "#/entities/library/index.ts";
import { CategoryPage } from "#/pages/category/index.ts";
import { ImportPage } from "#/pages/import/index.ts";
import { JudgePage } from "#/pages/judge/index.ts";
import { OverviewPage } from "#/pages/overview/index.ts";
import { SongsPage } from "#/pages/songs/index.ts";
import { CATEGORIES } from "#/shared/config/index.ts";
import type { Route } from "#/shared/lib/index.ts";

export const StylePage = ({
  library,
  current: style,
  route,
  baselines,
}: Readonly<{
  library: Library;
  current: Style;
  route: Route;
  baselines: readonly string[];
}>): ReactNode => {
  const overview = (): ReactNode => (
    <OverviewPage library={library} current={style} baselines={baselines} />
  );
  return Match.value(route).pipe(
    Match.discriminatorsExhaustive("page")({
      styles: overview,
      overview,
      category: ({ category }) =>
        pipe(
          Arr.findFirst(CATEGORIES, (each) => each.id === category),
          Option.match({
            onNone: overview,
            onSome: (found) => <CategoryPage library={library} current={style} category={found} />,
          }),
        ),
      judge: ({ habit }) => <JudgePage library={library} current={style} habit={habit} />,
      songs: ({ song }) => <SongsPage library={library} current={style} song={song} />,
      import: () => <ImportPage current={style} />,
    }),
  );
};
