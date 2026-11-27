import { createElement } from "react";
import type { ReactNode } from "react";

import type { FigureName } from "#/entities/entry/model/figure.ts";

import { figures } from "./figure-chunks.ts";

export const FigureBody = ({ name }: Readonly<{ name: FigureName }>): ReactNode =>
  createElement(figures[name]);
