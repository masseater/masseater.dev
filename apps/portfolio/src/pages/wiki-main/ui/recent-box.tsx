import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry";
import { RECENT_TITLE } from "#/pages/wiki-main/model/copy";
import { recent } from "#/pages/wiki-main/model/order";

import { MainBox } from "./main-box";
import { RecentItem } from "./recent-item";

const RecentBox = ({ entries }: Readonly<{ entries: readonly Entry[] }>): ReactNode => (
  <MainBox title={RECENT_TITLE}>
    <ul className="flex list-disc flex-col gap-1 ps-5 text-sm">
      {pipe(
        recent(entries),
        Arr.map((entry) => <RecentItem entry={entry} key={entry.slug} />),
      )}
    </ul>
  </MainBox>
);

export { RecentBox };
