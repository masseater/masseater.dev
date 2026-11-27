import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { aimsOf, songsOf } from "#/entities/library/index.ts";
import type { Library, Style } from "#/entities/library/index.ts";
import { useCandidates } from "#/features/find-candidates/index.ts";
import { LABELS } from "#/shared/config/index.ts";
import type { Category } from "#/shared/config/index.ts";
import { hrefOf, readyValue } from "#/shared/lib/index.ts";
import { Subtitle, Title } from "#/shared/ui/index.ts";

import { AimSection } from "./aim-section.tsx";
import { ViewChips } from "./view-chips.tsx";

export const CategoryPage = ({
  library,
  current: style,
  category,
}: Readonly<{ library: Library; current: Style; category: Category }>): ReactNode => {
  const candidates = pipe(
    readyValue(useCandidates({ library, style })),
    Option.match({ onNone: () => [], onSome: (found) => found.list }),
  );
  const songs = songsOf(library)(style.id);
  return (
    <div className="grid gap-3">
      <a
        className="text-muted-foreground text-xs"
        href={hrefOf({ page: "overview", style: style.id })}
      >
        {style.name}
      </a>
      <Title>{category.name}</Title>
      {pipe(
        aimsOf(library)({ style: style.id, category: category.id }),
        Arr.map((aim) => (
          <AimSection
            key={aim.id}
            library={library}
            aim={aim}
            candidates={candidates}
            songs={songs}
          />
        )),
      )}
      <Subtitle>{LABELS.views}</Subtitle>
      <ViewChips views={category.views} />
    </div>
  );
};
