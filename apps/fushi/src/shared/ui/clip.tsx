import type { ReactNode } from "react";

import { usePlayClip } from "#/shared/lib/index.ts";
import type { Snippet } from "#/shared/lib/index.ts";

import { PlayButton } from "./play-button.tsx";
import { Roll } from "./roll.tsx";

export const Clip = ({
  id,
  snippet,
  children,
}: Readonly<{ id: string; snippet: Snippet; children: ReactNode }>): ReactNode => {
  const controls = usePlayClip({ key: id, snippet });
  return (
    <figure className="grid gap-1 rounded-md border p-2 text-xs">
      <figcaption className="flex items-center justify-between gap-2">
        {children}
        <PlayButton controls={controls} />
      </figcaption>
      <Roll snippet={snippet} fraction={controls.fraction} />
    </figure>
  );
};
