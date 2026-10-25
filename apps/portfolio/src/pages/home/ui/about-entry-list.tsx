import { Link } from "@tanstack/react-router";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry";

const LABEL = {
  detailed: ({ title, description }: Entry) => `${title}（${description}）`,
  title: ({ title }: Entry) => title,
} as const;

const AboutEntryList = ({
  entries,
  label,
}: Readonly<{ entries: readonly Entry[]; label: keyof typeof LABEL }>): ReactNode => (
  <ul className="flex flex-col gap-2">
    {pipe(
      entries,
      Arr.map((entry) => (
        <li key={`${entry.category}/${entry.slug}`}>
          <Link className="hover:underline" params={entry} to="/$category/$slug">
            {LABEL[label](entry)}
          </Link>
        </li>
      )),
    )}
  </ul>
);

export { AboutEntryList };
