import { useAtomSet } from "@effect/atom-react";
import { FolderOpen } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useDroppedFiles } from "#/features/import-songs/model/drop.ts";
import { chooseAtom, importAtom } from "#/features/import-songs/model/import.ts";
import { LABELS } from "#/shared/config/index.ts";

import { LinkForm } from "./link-form.tsx";

export const ImportBar = (): ReactNode => {
  const send = useAtomSet(importAtom);
  const choose = useAtomSet(chooseAtom);
  const hovering = useDroppedFiles(send);
  const handleChoose = useCallback(() => {
    choose();
  }, [choose]);
  return (
    <div
      data-hovering={hovering}
      className="data-[hovering=true]:border-foreground data-[hovering=true]:bg-muted flex flex-col gap-2 rounded-md border border-dashed p-3"
    >
      <LinkForm />
      <button
        type="button"
        onClick={handleChoose}
        className="flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-sm"
      >
        <FolderOpen className="size-4" aria-hidden />
        {LABELS.chooseFiles}
      </button>
    </div>
  );
};
