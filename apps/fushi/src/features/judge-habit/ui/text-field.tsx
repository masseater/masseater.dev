import { useAtom } from "@effect/atom-react";
import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { textAtom } from "#/features/judge-habit/model/decide.ts";

export const TextField = ({
  habit,
  label,
}: Readonly<{ habit: string; label: string }>): ReactNode => {
  const [text, setText] = useAtom(textAtom(habit));
  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setText(event.currentTarget.value);
    },
    [setText],
  );
  return (
    <input
      value={text}
      aria-label={label}
      placeholder={label}
      autoComplete="off"
      className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 min-w-48 rounded-md border px-2 text-sm outline-none focus-visible:ring-3"
      onChange={change}
    />
  );
};
