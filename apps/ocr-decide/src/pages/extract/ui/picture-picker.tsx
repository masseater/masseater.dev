import { Option, Array as Arr, pipe } from "effect";
import { FileUp } from "lucide-react";
import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { usePicture } from "#/pages/extract/api/use-picture";
import type { Picture } from "#/pages/extract/api/use-picture";
import { COPY } from "#/pages/extract/model/copy";
import { useSetChoice } from "#/pages/extract/model/draft";
import { SAMPLES } from "#/pages/extract/model/samples";

import { SampleButton } from "./sample-button";

const FIRST = 0;

const statusOf = (picture: Picture): string => {
  if (picture.status === "failed") {
    return COPY.unreadable;
  }
  if (picture.status === "none") {
    return "";
  }
  return picture.name;
};

const PicturePicker = (): ReactNode => {
  const picture = usePicture();
  const choose = useSetChoice();
  const pick = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = Option.fromNullishOr(event.target.files).pipe(
        Option.flatMapNullishOr((files) => files.item(FIRST)),
      );
      if (Option.isSome(file)) {
        choose({ status: "chosen", name: file.value.name, url: URL.createObjectURL(file.value) });
      }
    },
    [choose],
  );
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="border-input hover:bg-accent dark:bg-input/30 inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm shadow-xs [&_svg]:size-4">
        <FileUp />
        {COPY.image}
        <input type="file" accept="image/*" className="sr-only" onChange={pick} />
      </label>
      {pipe(
        SAMPLES,
        Arr.map(({ name, label }) => <SampleButton key={name} name={name} label={label} />),
      )}
      <span className="text-muted-foreground text-xs">{statusOf(picture)}</span>
    </div>
  );
};

export { PicturePicker };
