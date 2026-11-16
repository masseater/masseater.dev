import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { PREFERENCES } from "#/pages/home/model/about.ts";

import { AboutItemList } from "./about-item-list.tsx";
import { AboutRow } from "./about-row.tsx";

export const AboutPreferences = (): ReactNode => (
  <dl className="flex flex-col gap-6">
    {pipe(
      PREFERENCES,
      Arr.map(({ term, items }) => (
        <AboutRow key={term} term={term}>
          <AboutItemList items={items} />
        </AboutRow>
      )),
    )}
  </dl>
);
