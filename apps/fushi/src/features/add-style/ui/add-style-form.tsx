import { useAtom, useAtomSet } from "@effect/atom-react";
import { Button } from "@masseater.dev/ui/button";
import { useCallback } from "react";
import type { ChangeEvent, ReactNode, SubmitEvent } from "react";

import { addStyleAtom, nameAtom } from "#/features/add-style/model/add.ts";
import { LABELS } from "#/shared/config/index.ts";

export const AddStyleForm = ({
  baselines,
}: Readonly<{ baselines: readonly string[] }>): ReactNode => {
  const [name, setName] = useAtom(nameAtom);
  const add = useAtomSet(addStyleAtom);
  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setName(event.currentTarget.value);
    },
    [setName],
  );
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      add(baselines);
    },
    [add, baselines],
  );
  return (
    <form
      className="flex min-h-28 flex-col justify-end gap-2 rounded-md border border-dashed p-3"
      onSubmit={submit}
    >
      <input
        value={name}
        aria-label={LABELS.styleName}
        placeholder={LABELS.styleName}
        autoComplete="off"
        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-3"
        onChange={change}
      />
      <Button type="submit" size="sm" variant="outline">
        {LABELS.addStyle}
      </Button>
    </form>
  );
};
