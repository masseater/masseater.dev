import { useAtom, useAtomSet } from "@effect/atom-react";
import { cn } from "@masseater.dev/ui/cn";
import { Upload } from "lucide-react";
import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { ACCEPTED } from "#/features/import-songs/model/convert.ts";
import { hoveringAtom, importAtom } from "#/features/import-songs/model/import.ts";
import { LABELS } from "#/shared/config/index.ts";

export const DropZone = ({ current: style }: Readonly<{ current: string }>): ReactNode => {
  const [hovering, setHovering] = useAtom(hoveringAtom);
  const send = useAtomSet(importAtom);
  const enter = useCallback(() => {
    setHovering(true);
  }, [setHovering]);
  const leave = useCallback(() => {
    setHovering(false);
  }, [setHovering]);
  const choose = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setHovering(false);
      send({ style, files: [...(event.currentTarget.files ?? [])] });
    },
    [send, setHovering, style],
  );
  return (
    <label
      className={cn(
        "text-muted-foreground hover:border-foreground relative flex flex-col items-center gap-2 rounded-md border-2 border-dashed p-8 text-sm",
        hovering && "border-foreground bg-muted",
      )}
    >
      <Upload className="size-5" aria-hidden />
      {LABELS.drop}
      <input
        type="file"
        multiple
        accept={ACCEPTED}
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={choose}
        onDragEnter={enter}
        onDragLeave={leave}
      />
    </label>
  );
};
