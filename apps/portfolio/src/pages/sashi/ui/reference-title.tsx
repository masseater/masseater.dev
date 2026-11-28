import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import type { Item } from "#/pages/sashi/model/shelf.ts";

const TITLE_CLASS = "font-display shrink-0 self-start text-xl font-light sm:w-64";

const LINK_CLASS = `${TITLE_CLASS} hover:text-foreground/70 transition-colors`;

export const ReferenceTitle = ({ item }: Readonly<{ item: Item }>): ReactNode => (
  <>
    {pipe(
      Option.toArray(item.link),
      Arr.map((url) => (
        <a className={LINK_CLASS} href={url} key={url} rel="noopener noreferrer" target="_blank">
          {item.title}
        </a>
      )),
    )}
    {pipe(
      Arr.filter([item.title], () => Option.isNone(item.link)),
      Arr.map((title) => (
        <span className={TITLE_CLASS} key={title}>
          {title}
        </span>
      )),
    )}
  </>
);
