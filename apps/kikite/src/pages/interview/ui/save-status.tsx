import type { ReactNode } from "react";

import { useSaving } from "#/pages/interview/model/hooks";
import type { Saving } from "#/pages/interview/model/hooks";

const LABELS: Readonly<Record<Saving["status"], string>> = {
  idle: "",
  saving: "保存中",
  saved: "保存済み",
  failed: "保存できていません",
};

const TONES: Readonly<Record<Saving["status"], string>> = {
  idle: "text-muted-foreground",
  saving: "text-muted-foreground",
  saved: "text-muted-foreground",
  failed: "text-destructive",
};

const detailOf = (saving: Saving): string => {
  if (saving.status === "failed") {
    return saving.message;
  }
  return "";
};

const SaveStatus = (): ReactNode => {
  const saving = useSaving();
  return (
    <output
      title={detailOf(saving)}
      className={`text-xs whitespace-nowrap ${TONES[saving.status]}`}
    >
      {LABELS[saving.status]}
    </output>
  );
};

export { SaveStatus };
