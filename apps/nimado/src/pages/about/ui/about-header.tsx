import type { ReactNode } from "react";

import { TEXT } from "#/pages/about/model/content.ts";
import { BASE_PATH } from "#/shared/config/index.ts";

export const AboutHeader = (): ReactNode => (
  <header className="flex items-baseline justify-between gap-4">
    <h1 className="text-2xl font-bold">{TEXT.title}</h1>
    <a href={`${BASE_PATH}/`} className="text-muted-foreground underline">
      {TEXT.back}
    </a>
  </header>
);
