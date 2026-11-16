import type { ReactNode } from "react";

import { FormatField } from "#/features/configure-run/index.ts";
import { OpenFile } from "#/features/open-file/index.ts";
import { ExampleList } from "#/features/pick-example/index.ts";

export const SourceBar = (): ReactNode => (
  <div className="flex flex-wrap gap-2">
    <ExampleList />
    <FormatField />
    <OpenFile />
  </div>
);
