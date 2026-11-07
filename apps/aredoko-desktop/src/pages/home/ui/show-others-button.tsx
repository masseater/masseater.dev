import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { useShowOthers } from "#/pages/home/model";

import { ActionButton } from "./action-button.tsx";

const SHOW_LABELS = { true: "近いものを見る", false: "ほかの候補を見る" } as const;

const ShowOthersButton = ({ nothingClose }: Readonly<{ nothingClose: boolean }>): ReactNode => {
  const show = useShowOthers();
  const label = SHOW_LABELS[`${nothingClose}`];
  return (
    <ActionButton onClick={show}>
      <ChevronDown />
      {label}
    </ActionButton>
  );
};

export { ShowOthersButton };
