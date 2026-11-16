import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { useShowOthers } from "#/entities/asset/index.ts";
import { ActionButton } from "#/shared/ui/action-button.tsx";

const SHOW_LABELS = { true: "近いものを見る", false: "ほかの候補を見る" } as const;

export const ShowOthersButton = ({
  nothingClose,
}: Readonly<{ nothingClose: boolean }>): ReactNode => {
  const show = useShowOthers();
  const label = SHOW_LABELS[`${nothingClose}`];
  return (
    <ActionButton onClick={show}>
      <ChevronDown />
      {label}
    </ActionButton>
  );
};
