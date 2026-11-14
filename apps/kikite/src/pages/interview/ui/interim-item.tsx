import type { ReactNode } from "react";

import { phrased } from "#/pages/interview/lib/phrases";

const InterimItem = ({ text }: Readonly<{ text: string }>): ReactNode =>
  text !== "" && (
    <li className="text-muted-foreground border-foreground border-l-2 pl-3 leading-relaxed wrap-anywhere break-keep">
      {phrased(text)}
    </li>
  );

export { InterimItem };
