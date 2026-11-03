import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry";
import { INDEX_TITLE } from "#/pages/wiki-main/model/copy";
import { byTitle } from "#/pages/wiki-main/model/order";

import { IndexItem } from "./index-item";
import { MainBox } from "./main-box";

const IndexBox = ({ entries }: Readonly<{ entries: readonly Entry[] }>): ReactNode => (
  <MainBox title={INDEX_TITLE}>
    <ul className="flex flex-col gap-3 text-sm">
      {pipe(
        byTitle(entries),
        Arr.map((entry) => <IndexItem entry={entry} key={entry.slug} />),
      )}
    </ul>
  </MainBox>
);

export { IndexBox };
