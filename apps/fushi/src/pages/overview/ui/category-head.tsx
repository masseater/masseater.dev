import type { ReactNode } from "react";

import { LABELS } from "#/shared/config/index.ts";

import { CountHeading } from "./count-heading.tsx";

export const CategoryHead = (): ReactNode => (
  <tr>
    <th className="p-2">{LABELS.categories}</th>
    <th className="p-2">{LABELS.views}</th>
    <CountHeading>{LABELS.aims}</CountHeading>
    <CountHeading>{LABELS.rules}</CountHeading>
    <CountHeading>{LABELS.suggestions}</CountHeading>
  </tr>
);
