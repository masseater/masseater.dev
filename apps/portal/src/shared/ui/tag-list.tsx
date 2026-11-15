import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

const LABEL = "タグ";

const TagList = ({ tags }: Readonly<{ tags: readonly string[] }>): ReactNode =>
  Arr.isReadonlyArrayNonEmpty(tags) && (
    <ul
      aria-label={LABEL}
      className="font-display text-foreground/50 flex max-w-full min-w-0 flex-wrap gap-1.5 text-xs tracking-widest"
    >
      {pipe(
        tags,
        Arr.map((tag) => (
          <li
            className="ring-foreground/10 max-w-full truncate rounded-full px-2 py-0.5 ring-1"
            key={tag}
            title={tag}
          >
            {tag}
          </li>
        )),
      )}
    </ul>
  );

export { TagList };
