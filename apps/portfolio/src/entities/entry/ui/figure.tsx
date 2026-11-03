import type { ComponentType, ReactNode } from "react";

import type { FigureName } from "#/entities/entry/model/figure";

import { Architecture } from "./architecture";
import { CascadeFailure } from "./cascade-failure";
import { FigureCaption } from "./figure-caption";

const figures = {
  "cascade-failure": CascadeFailure,
  architecture: Architecture,
} as const satisfies Record<FigureName, ComponentType>;

const Figure = ({ name, caption }: Readonly<{ name: FigureName; caption: string }>): ReactNode => {
  const Body = figures[name];
  return (
    <figure className="my-10">
      <Body />
      {caption !== "" && <FigureCaption caption={caption} />}
    </figure>
  );
};

export { Figure };
