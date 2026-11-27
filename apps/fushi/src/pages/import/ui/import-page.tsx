import type { ReactNode } from "react";

import type { Style } from "#/entities/library/index.ts";
import { DropZone, ImportResults, JudgeLink } from "#/features/import-songs/index.ts";
import { LABELS } from "#/shared/config/index.ts";
import { Title } from "#/shared/ui/index.ts";

export const ImportPage = ({ current: style }: Readonly<{ current: Style }>): ReactNode => (
  <div className="grid gap-4">
    <Title>{LABELS.importSongs}</Title>
    <DropZone current={style.id} />
    <ImportResults current={style.id} />
    <JudgeLink current={style.id} />
  </div>
);
