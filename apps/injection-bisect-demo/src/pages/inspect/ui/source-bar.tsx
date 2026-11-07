import type { ReactNode } from "react";

import { ExampleList } from "./example-list";
import { FormatField } from "./format-field";
import { OpenFile } from "./open-file";

const SourceBar = (): ReactNode => (
  <div className="flex flex-wrap gap-2">
    <ExampleList />
    <FormatField />
    <OpenFile />
  </div>
);

export { SourceBar };
