import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

const LABEL = "タグ";

export const TagList = ({ tags }: Readonly<{ tags: readonly string[] }>): ReactNode =>
  Arr.isReadonlyArrayNonEmpty(tags) && (
    <ul aria-label={LABEL} className="flex max-w-full min-w-0 flex-wrap gap-1">
      {pipe(
        tags,
        Arr.map((tag) => (
          <li
            className="bg-muted text-secondary-foreground max-w-full truncate rounded-full border px-2 text-xs leading-6"
            key={tag}
            title={tag}
          >
            {tag}
          </li>
        )),
      )}
    </ul>
  );
