import { useAtom } from "@effect/atom-react";
import { Button } from "@masseater.dev/ui/button";
import { AsyncResult } from "effect/reactivity";
import { LoaderCircle } from "lucide-react";
import { useCallback } from "react";
import type { ChangeEvent, ReactNode, SubmitEvent } from "react";

import { linkAtom, openLinkAtom } from "#/features/open-media/model/open.ts";
import { useFileDrop } from "#/features/open-media/model/use-file-drop.ts";

import { ChooseFile } from "./choose-file.tsx";
import { Refusal } from "./refusal.tsx";

const OPEN = "開く";

export const OpenBar = ({
  files,
  label,
}: Readonly<{ files: boolean; label: string }>): ReactNode => {
  const [link, setLink] = useAtom(linkAtom);
  const [opened, open] = useAtom(openLinkAtom);
  useFileDrop(files);
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      open(link);
    },
    [open, link],
  );
  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setLink(event.currentTarget.value);
    },
    [setLink],
  );
  return (
    <form className="flex flex-wrap gap-2" onSubmit={submit}>
      <input
        type="url"
        value={link}
        aria-label={label}
        aria-invalid={AsyncResult.isFailure(opened)}
        placeholder="https://"
        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-9 min-w-0 flex-1 rounded-md border px-3 font-mono text-sm outline-none focus-visible:ring-3"
        onChange={change}
      />
      <Button type="submit" disabled={opened.waiting}>
        {opened.waiting && <LoaderCircle className="animate-spin" />}
        {OPEN}
      </Button>
      {files && <ChooseFile />}
      <Refusal />
    </form>
  );
};
