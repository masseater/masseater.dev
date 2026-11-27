import type { ReactNode } from "react";

import { songsOf } from "#/entities/library/index.ts";
import type { Library, Style } from "#/entities/library/index.ts";
import { BaselineSelect } from "#/features/choose-baseline/index.ts";
import { ExportButton } from "#/features/export-preset/index.ts";
import { LABELS } from "#/shared/config/index.ts";
import { Subtitle, Title } from "#/shared/ui/index.ts";

import { CategoryTable } from "./category-table.tsx";
import { SongLinks } from "./song-links.tsx";

export const OverviewPage = ({
  library,
  current: style,
  baselines,
}: Readonly<{ library: Library; current: Style; baselines: readonly string[] }>): ReactNode => (
  <div className="grid gap-3">
    <Title>{style.name}</Title>
    <BaselineSelect current={style} baselines={baselines} />
    <ExportButton library={library} current={style} />
    <Subtitle>{LABELS.categories}</Subtitle>
    <CategoryTable library={library} current={style} />
    <Subtitle>{LABELS.analyzed}</Subtitle>
    <SongLinks current={style.id} songs={songsOf(library)(style.id)} />
  </div>
);
