import { DEFAULT_READERS, ReadError, readDocument } from "@r_masseater/injection-bisect";
import type { Document } from "@r_masseater/injection-bisect";
import { Effect, Option } from "effect";
import { FileUp } from "lucide-react";
import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { COPY } from "#/pages/inspect/model/copy";
import {
  NOT_OPENING,
  useOpening,
  useSetDraftText,
  useSetFormat,
  useSetOpening,
} from "#/pages/inspect/model/draft";
import type { Opening } from "#/pages/inspect/model/draft";

const FIRST = 0;

interface Picked {
  readonly name: string;
  readonly load: () => Promise<ArrayBuffer>;
}

const statusOf = (opening: Opening): string => {
  if (opening.status === "reading") {
    return `${COPY.reading}: ${opening.name}`;
  }
  if (opening.status === "failed") {
    return `${COPY.unreadable}: ${opening.name} (${opening.reason})`;
  }
  return "";
};

const documentOf = ({ name, load }: Picked): Effect.Effect<Document, ReadError> =>
  Effect.tryPromise({
    try: load,
    catch: (cause) => ReadError.make({ reason: String(cause) }),
  }).pipe(
    Effect.flatMap((buffer) =>
      readDocument({ bytes: new Uint8Array(buffer), name, readers: DEFAULT_READERS }),
    ),
  );

const pickedOf = (event: ChangeEvent<HTMLInputElement>): Option.Option<Picked> =>
  Option.fromNullishOr(event.target.files).pipe(
    Option.flatMapNullishOr((files) => files.item(FIRST)),
    Option.map((file) => ({ name: file.name, load: () => file.arrayBuffer() })),
  );

const OpenFile = (): ReactNode => {
  const opening = useOpening();
  const setOpening = useSetOpening();
  const setText = useSetDraftText();
  const setFormat = useSetFormat();
  const open = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      Option.map(pickedOf(event), (picked) => {
        setOpening({ status: "reading", name: picked.name });
        Effect.runFork(
          documentOf(picked).pipe(
            Effect.match({
              onFailure: ({ reason }) => {
                setOpening({ status: "failed", name: picked.name, reason });
              },
              onSuccess: ({ text, format }) => {
                setText(text);
                setFormat(format);
                setOpening(NOT_OPENING);
              },
            }),
          ),
        );
      });
    },
    [setOpening, setText, setFormat],
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
