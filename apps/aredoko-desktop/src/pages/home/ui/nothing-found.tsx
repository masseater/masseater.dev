import type { ReactNode } from "react";

import { IndexingProgress } from "#/features/indexing";
import { Notice } from "#/shared/ui/notice";

const NothingFound = ({ text }: Readonly<{ text: string }>): ReactNode => (
  <div className="flex flex-col gap-2">
    <Notice>{text}</Notice>
    <IndexingProgress size="sm" />
  </div>
);

export { NothingFound };
