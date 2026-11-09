import type { ReactNode } from "react";

import { usePicker } from "#/entities/language";
import { LanguagePicker } from "#/features/choose-language";

import { Panes } from "./panes.tsx";

const Workspace = (): ReactNode => {
  const picker = usePicker();
  if (picker.kind === "open") {
    return <LanguagePicker side={picker.side} />;
  }
  return <Panes />;
};

export { Workspace };
