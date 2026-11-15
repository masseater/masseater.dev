import type { ReactNode } from "react";

import { FormatField } from "#/features/configure-run";
import { OpenFile } from "#/features/open-file";
import { ExampleList } from "#/features/pick-example";

export const SourceBar = (): ReactNode => (
  <div className="flex flex-wrap gap-2">
    <ExampleList />
    <FormatField />
    <OpenFile />
  </div>
);
