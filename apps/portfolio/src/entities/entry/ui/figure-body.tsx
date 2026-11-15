import { Option } from "effect";
import { use } from "react";
import type { ReactNode } from "react";

import type { FigureName } from "#/entities/entry/model/figure.ts";

import { importFigure, importedFigure } from "./figure-chunks";

export const FigureBody = ({ name }: Readonly<{ name: FigureName }>): ReactNode =>
  Option.getOrElse(importedFigure(name), () => use(importFigure(name)));
