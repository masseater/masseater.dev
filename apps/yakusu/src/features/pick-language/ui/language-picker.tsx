import type { ReactNode } from "react";

import type { Side } from "#/entities/language";

import { PickerChoices } from "./picker-choices.tsx";
import { PickerSearch } from "./picker-search.tsx";

const LanguagePicker = ({ side }: Readonly<{ side: Side }>): ReactNode => (
  <div className="flex min-h-80 flex-col">
    <PickerSearch />
    <PickerChoices side={side} />
  </div>
);

export { LanguagePicker };
