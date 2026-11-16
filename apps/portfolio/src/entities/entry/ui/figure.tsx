import { Suspense } from "react";
import type { ReactNode } from "react";

import type { FigureName } from "#/entities/entry/model/figure.ts";

import { CascadePlaceholder } from "./cascade-placeholder.tsx";
import { FigureBody } from "./figure-body.tsx";
import { FigureCaption } from "./figure-caption.tsx";

const placeholders = {
  "cascade-failure": <CascadePlaceholder />,
} as const satisfies Record<FigureName, ReactNode>;

export const Figure = ({
  name,
  caption,
}: Readonly<{ name: FigureName; caption: string }>): ReactNode => (
  <figure className="my-10">
    <Suspense fallback={placeholders[name]}>
      <FigureBody name={name} />
    </Suspense>
    {caption !== "" && <FigureCaption caption={caption} />}
  </figure>
);
