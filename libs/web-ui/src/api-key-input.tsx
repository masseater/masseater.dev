import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { Input } from "./ui/input.tsx";

const ApiKeyInput = ({
  label,
  value,
  onValueChange,
}: Readonly<{
  label: string;
  value: string;
  onValueChange: (value: string) => void;
}>): ReactNode => {
  const edit = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onValueChange(event.target.value);
    },
    [onValueChange],
  );
  return (
    <Input
      type="password"
      autoComplete="off"
      placeholder={label}
      aria-label={label}
      value={value}
      onChange={edit}
    />
  );
};

export { ApiKeyInput };
