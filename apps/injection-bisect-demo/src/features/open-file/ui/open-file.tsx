import type { Unreadable } from "@r_masseater/injection-bisect";
import { Array as Arr, Option, pipe } from "effect";
import { FileUp } from "lucide-react";
import { useCallback, useMemo } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { useOpening, useSetDraftText, useSetFormat, useSetOpening } from "#/entities/inspection";
import type { Opening } from "#/entities/inspection";
import { openerOf, pickedOf } from "#/features/open-file/model/open-file";
import type { Picked } from "#/features/open-file/model/open-file";
import { COPY } from "#/shared/config";

const SHOWN_NAMES = 3;

const namesOf = (unreadable: readonly Unreadable[]): string => {
  const [shown, rest] = pipe(
    unreadable,
    Arr.map(({ name }) => name),
    Arr.splitAt(SHOWN_NAMES),
  );
  if (Arr.isReadonlyArrayEmpty(rest)) {
    return pipe(shown, Arr.join("　"));
  }
  return pipe([...shown, COPY.others(rest.length)], Arr.join("　"));
};

const statusOf = (opening: Opening): string => {
  if (opening.status === "reading") {
    return `${COPY.reading}: ${opening.name}`;
  }
  if (opening.status === "failed") {
    return `${COPY.unreadable}: ${opening.name} (${opening.reason})`;
  }
  if (opening.status === "partial") {
    return `${COPY.unread}　${namesOf(opening.unreadable)}`;
  }
  return "";
};

const useOpenFile = (): ((picked: Picked) => void) => {
  const setOpening = useSetOpening();
  const setText = useSetDraftText();
  const setFormat = useSetFormat();
  return useMemo(
    () =>
      openerOf({
        opening: setOpening,
        draft: ({ text, format }) => {
          setText(text);
          setFormat(format);
        },
      }),
    [setOpening, setText, setFormat],
  );
};

const OpenFile = (): ReactNode => {
  const opening = useOpening();
  const openFile = useOpenFile();
  const open = useCallback(
    ({ currentTarget }: ChangeEvent<HTMLInputElement>) => {
      Option.map(pickedOf(currentTarget.files), openFile);
      currentTarget.value = "";
    },
    [openFile],
  );
  return (
    <div className="flex items-center gap-2">
      <label className="border-input hover:bg-accent dark:bg-input/30 inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm shadow-xs [&_svg]:size-4">
        <FileUp />
        {COPY.open}
        <input type="file" className="sr-only" onChange={open} />
      </label>
      <span className="text-muted-foreground text-xs">{statusOf(opening)}</span>
    </div>
  );
};

export { OpenFile };
