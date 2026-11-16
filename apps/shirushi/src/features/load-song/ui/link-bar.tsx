import { useAtom } from "@effect/atom-react";
import { Button } from "@masseater.dev/ui/button";
import { AsyncResult } from "effect/reactivity";
import { LoaderCircle } from "lucide-react";
import { useCallback } from "react";
import type { ChangeEvent, ReactNode, SubmitEvent } from "react";

import { linkAtom, loadAtom } from "#/features/load-song/model/load";

const LOAD = "読み込む";

export const LinkBar = (): ReactNode => {
  const [link, setLink] = useAtom(linkAtom);
  const [loaded, load] = useAtom(loadAtom);
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      load(link);
    },
    [load, link],
  );
  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setLink(event.currentTarget.value);
    },
    [setLink],
  );
  return (
    <form className="flex gap-2" onSubmit={submit}>
      <input
        type="url"
        value={link}
        aria-label="曲のリンク"
        aria-invalid={AsyncResult.isFailure(loaded)}
        placeholder="https://"
        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-9 min-w-0 flex-1 rounded-md border px-3 font-mono text-sm outline-none focus-visible:ring-3"
        onChange={change}
      />
      <Button type="submit" disabled={loaded.waiting}>
        {loaded.waiting && <LoaderCircle className="animate-spin" />}
        {LOAD}
      </Button>
    </form>
  );
};
