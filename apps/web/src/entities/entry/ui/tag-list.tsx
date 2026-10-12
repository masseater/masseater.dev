import type { ReactNode } from "react";

const LABEL = "タグ";

const TagList = ({ tags }: Readonly<{ tags: readonly string[] }>): ReactNode => (
  <ul aria-label={LABEL} className="flex flex-wrap gap-x-3">
    {tags.map((tag) => (
      <li key={tag}>{tag}</li>
    ))}
  </ul>
);

export { TagList };
