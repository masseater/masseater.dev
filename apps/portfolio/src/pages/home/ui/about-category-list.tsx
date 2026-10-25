import { Link } from "@tanstack/react-router";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { categoryInfos } from "#/entities/entry";

const AboutCategoryList = (): ReactNode => (
  <ul className="flex flex-col gap-2">
    {pipe(
      categoryInfos,
      Arr.map((info) => (
        <li key={info.category}>
          <Link className="hover:underline" params={info} to="/$category">
            {`${info.title}（${info.description}）`}
          </Link>
        </li>
      )),
    )}
  </ul>
);

export { AboutCategoryList };
