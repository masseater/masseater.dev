import type { ReactNode } from "react";

import { usePicker } from "#/pages/translator/model/selection.ts";

import { LanguagePicker } from "./language-picker.tsx";
import { Panes } from "./panes.tsx";

const Workspace = (): ReactNode => {
  const picker = usePicker();
  if (picker.kind === "open") {
    return <LanguagePicker side={picker.side} />;
  }
  return <Panes />;
};

export { Workspace };
