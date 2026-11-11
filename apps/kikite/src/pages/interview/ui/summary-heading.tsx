import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

const TITLE = "要約";

const SummaryHeading = ({ updating }: Readonly<{ updating: boolean }>): ReactNode => (
  <h2 className="flex items-center gap-2 text-sm font-semibold">
    {TITLE}
    {updating && <LoaderCircle className="size-3.5 animate-spin" />}
  </h2>
);

export { SummaryHeading };
