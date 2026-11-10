import { Option } from "effect";
import { use } from "react";
import type { ReactNode } from "react";

import type { FigureName } from "#/entities/entry/model/figure";

import { importFigure, importedFigure } from "./figure-chunks";

const FigureBody = ({ name }: Readonly<{ name: FigureName }>): ReactNode =>
  Option.getOrElse(importedFigure(name), () => use(importFigure(name)));

export { FigureBody };
