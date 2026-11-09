import { ToggleGroup } from "radix-ui";
import type { ReactNode } from "react";

import type { FormOption } from "#/features/translate-text/model/form";

const FormChoiceItem = ({ option }: Readonly<{ option: FormOption }>): ReactNode => (
  <ToggleGroup.Item
    className="text-muted-foreground hover:text-foreground data-[state=on]:bg-highlight/12 data-[state=on]:text-highlight rounded-full px-3 py-1 transition-colors"
    value={option.choice}
  >
    {option.label}
  </ToggleGroup.Item>
);

export { FormChoiceItem };
