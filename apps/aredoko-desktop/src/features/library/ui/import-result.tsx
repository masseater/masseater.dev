import { CircleAlert, CircleCheck } from "lucide-react";
import type { ReactNode } from "react";

import { useLastImport } from "#/features/library/api/queries";
import { Notice } from "#/shared/ui/notice";

const NOTHING = "取り込めるアセットがありませんでした";
const NONE_PLACED = 0;

const ImportResult = (): ReactNode => {
  const last = useLastImport();
  if (last.status === "failed") {
    return (
      <Notice tone="error" size="xs">
        <CircleAlert />
        {last.message}
      </Notice>
    );
  }
  if (last.status !== "placed") {
    return false;
  }
  if (last.packages === NONE_PLACED) {
    return (
      <Notice size="xs">
        <CircleAlert />
        {NOTHING}
      </Notice>
    );
  }
  return (
    <Notice size="xs">
      <CircleCheck />
      {`${last.packages.toString()} 個を取り込みました`}
    </Notice>
  );
};

export { ImportResult };
