import type { ReactNode } from "react";

import { UPDATED_LABEL } from "#/pages/wiki-article/model/copy";
import { japaneseDate } from "#/pages/wiki-article/model/updated";

const UpdatedNote = ({ date }: Readonly<{ date: string }>): ReactNode => (
  <p className="text-wiki-subtle mt-4 flex gap-1 text-xs">
    {UPDATED_LABEL}
    <time dateTime={date}>{japaneseDate(date)}</time>
  </p>
);

export { UpdatedNote };
