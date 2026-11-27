import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Library } from "#/entities/library/index.ts";
import { AddStyleForm } from "#/features/add-style/index.ts";
import { LABELS } from "#/shared/config/index.ts";
import { Title } from "#/shared/ui/index.ts";

import { StyleCard } from "./style-card.tsx";

export const StylesPage = ({
  library,
  baselines,
}: Readonly<{ library: Library; baselines: readonly string[] }>): ReactNode => (
  <div className="mx-auto grid w-full max-w-4xl gap-5">
    <Title>{LABELS.chooseStyle}</Title>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {pipe(
        library.styles,
        Arr.map((style) => <StyleCard key={style.id} current={style} />),
      )}
      <AddStyleForm baselines={baselines} />
    </div>
  </div>
);
