import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

const LABEL = "タグ";

const TagList = ({ tags }: Readonly<{ tags: readonly string[] }>): ReactNode => (
  <ul aria-label={LABEL} className="flex flex-wrap gap-x-3">
    {pipe(
      tags,
      Arr.map((tag) => <li key={tag}>{tag}</li>),
    )}
  </ul>
);

export { TagList };
