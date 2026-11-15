import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { works } from "#/pages/nikogori/model/works.ts";
import { sectionMeta } from "#/shared/config/index.ts";

import { WorkItem } from "./work-item";

export const NikogoriPage = (): ReactNode => (
  <div className="flex flex-col" data-wide>
    <h1 className="sr-only">{sectionMeta.nikogori.title}</h1>
    <ul className="flex flex-col gap-8">
      {pipe(
        works,
        Arr.map((work) => <WorkItem key={work.slug} work={work} />),
      )}
    </ul>
  </div>
);
