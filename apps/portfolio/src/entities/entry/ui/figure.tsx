import { Suspense } from "react";
import type { ReactNode } from "react";

import type { FigureName } from "#/entities/entry/model/figure";

import { CascadePlaceholder } from "./cascade-placeholder";
import { FigureBody } from "./figure-body";
import { FigureCaption } from "./figure-caption";

const placeholders = {
  "cascade-failure": <CascadePlaceholder />,
} as const satisfies Record<FigureName, ReactNode>;

const Figure = ({ name, caption }: Readonly<{ name: FigureName; caption: string }>): ReactNode => (
  <figure className="my-10">
    <Suspense fallback={placeholders[name]}>
      <FigureBody name={name} />
    </Suspense>
    {caption !== "" && <FigureCaption caption={caption} />}
  </figure>
);

export { Figure };
