import type { ReactNode } from "react";

const LABEL = "タグ";

const TagList = ({ tags }: Readonly<{ tags: readonly string[] }>): ReactNode => (
  <ul aria-label={LABEL} className="flex flex-wrap gap-2">
    {tags.map((tag) => (
      <li className="bg-secondary text-secondary-foreground rounded-md px-2" key={tag}>
        {tag}
      </li>
    ))}
  </ul>
);

export { TagList };
