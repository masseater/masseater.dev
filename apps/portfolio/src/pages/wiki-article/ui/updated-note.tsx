import type { ReactNode } from "react";

import { UPDATED_PREFIX, UPDATED_SUFFIX } from "#/pages/wiki-article/model/copy";
import { japaneseDate } from "#/pages/wiki-article/model/updated";

const UpdatedNote = ({ date }: Readonly<{ date: string }>): ReactNode => (
  <p className="text-wiki-subtle mt-4 text-xs">
    {UPDATED_PREFIX}
    <time dateTime={date}>{japaneseDate(date)}</time>
    {UPDATED_SUFFIX}
  </p>
);

export { UpdatedNote };
