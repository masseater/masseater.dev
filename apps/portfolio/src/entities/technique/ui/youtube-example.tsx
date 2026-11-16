import type { ReactNode } from "react";

import type { Example } from "#/entities/technique/model/technique.ts";
import { YouTubeLink } from "#/shared/ui/index.ts";

export const YouTubeExample = ({
  example,
}: Readonly<{ example: Extract<Example, Readonly<{ kind: "youtube" }>> }>): ReactNode => (
  <YouTubeLink id={example.id} title={example.title} />
);
