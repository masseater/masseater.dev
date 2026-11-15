import type { ReactNode } from "react";

import { YouTubeLink } from "#/shared/ui";

export const YouTube = ({ id, title }: Readonly<{ id: string; title: string }>): ReactNode => (
  <div className="my-6">
    <YouTubeLink id={id} title={title} />
  </div>
);
