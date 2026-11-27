import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { songsOf } from "#/entities/library/index.ts";
import type { Library, Style } from "#/entities/library/index.ts";
import { hrefOf } from "#/shared/lib/index.ts";
import { NavLink } from "#/shared/ui/index.ts";

export const SongsNav = ({
  library,
  current: style,
  song,
}: Readonly<{ library: Library; current: Style; song: Option.Option<string> }>): ReactNode =>
  pipe(
    songsOf(library)(style.id),
    Arr.map((each) => (
      <NavLink
        key={each.id}
        href={hrefOf({ page: "songs", style: style.id, song: Option.some(each.id) })}
        active={Option.contains(song, each.id)}
      >
        {each.name}
      </NavLink>
    )),
  );
