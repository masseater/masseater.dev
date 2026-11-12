import type { ReactNode } from "react";

import { useTitle } from "#/pages/write/api/title.ts";

const TitleField = (): ReactNode => {
  const { title, rename } = useTitle();
  const written = title !== null && title.by === "writer" ? title.text : "";
  const proposed = title !== null && title.by === "ai" ? title.text : "";
  return (
    <input
      key={written}
      aria-label="題名"
      defaultValue={written}
      placeholder={proposed}
      onBlur={(event) => rename(event.currentTarget.value)}
      className="w-80 bg-transparent text-sm font-bold outline-none placeholder:font-normal placeholder:text-muted-foreground"
    />
  );
};

export { TitleField };
