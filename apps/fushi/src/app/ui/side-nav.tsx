import { Match } from "effect";
import type { ReactNode } from "react";

import type { Library, Style } from "#/entities/library/index.ts";
import { JudgeNav } from "#/pages/judge/index.ts";
import { SongsNav } from "#/pages/songs/index.ts";
import { LABELS } from "#/shared/config/index.ts";
import { hrefOf } from "#/shared/lib/index.ts";
import type { Route } from "#/shared/lib/index.ts";
import { NavLink } from "#/shared/ui/index.ts";

import { HabitsNav } from "./habits-nav.tsx";

export const SideNav = ({
  library,
  current: style,
  route,
}: Readonly<{ library: Library; current: Style; route: Route }>): ReactNode =>
  Match.value(route).pipe(
    Match.discriminatorsExhaustive("page")({
      styles: () => <HabitsNav current={style.id} route={route} />,
      overview: () => <HabitsNav current={style.id} route={route} />,
      category: () => <HabitsNav current={style.id} route={route} />,
      judge: ({ habit }) => <JudgeNav library={library} current={style} habit={habit} />,
      songs: ({ song }) => <SongsNav library={library} current={style} song={song} />,
      import: () => (
        <NavLink href={hrefOf({ page: "import", style: style.id })} active>
          {LABELS.importSongs}
        </NavLink>
      ),
    }),
  );
