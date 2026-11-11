import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { useAsking } from "#/pages/interview/model/hooks";

const AskFailed = (): ReactNode => {
  const asking = useAsking();
  return (
    asking.status === "failed" && (
      <p className="text-destructive flex items-center gap-1.5 text-xs">
        <CircleAlert className="size-3.5 shrink-0" />
        {asking.message}
      </p>
    )
  );
};

export { AskFailed };
