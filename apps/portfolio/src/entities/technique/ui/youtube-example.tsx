import type { ReactNode } from "react";

import type { Example } from "#/entities/technique/model/technique";
import { YouTubeLink } from "#/shared/ui";

const YouTubeExample = ({
  example,
}: Readonly<{ example: Extract<Example, Readonly<{ kind: "youtube" }>> }>): ReactNode => (
  <YouTubeLink id={example.id} title={example.title} />
);

export { YouTubeExample };
