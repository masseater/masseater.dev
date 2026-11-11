import type { ReactNode } from "react";

import { useInterim } from "#/pages/interview/model/hooks";

const InterimItem = (): ReactNode => {
  const interim = useInterim();
  return interim !== "" && <li className="text-muted-foreground text-base">{interim}</li>;
};

export { InterimItem };
