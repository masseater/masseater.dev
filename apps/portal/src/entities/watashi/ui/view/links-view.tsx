import type { ViewNode } from "@masseater.dev/watashi-protocol";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

export const LinksView = ({
  items,
}: Pick<Extract<ViewNode, Readonly<{ type: "Links" }>>, "items">): ReactNode => (
  <ul className="flex flex-wrap gap-x-4 gap-y-1">
    {pipe(
      items,
      Arr.map((item) => (
        <li key={item.href}>
          <a className="text-link underline underline-offset-3" href={item.href}>
            {item.label}
          </a>
        </li>
      )),
    )}
  </ul>
);
