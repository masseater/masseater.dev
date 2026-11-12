import type { Title } from "@masseater.dev/yohaku-protocol";
import { Option, String, pipe } from "effect";
import { useCallback } from "react";
import type { FocusEvent, ReactNode } from "react";

import { useTitle } from "#/pages/write/api/title.ts";

const LABEL = "題名";

const titleBy =
  (by: (typeof Title.Type)["by"]) =>
  (title: typeof Title.Type | null): string =>
    pipe(
      Option.fromNullishOr(title),
      Option.filter((current) => current.by === by),
      Option.match({ onNone: () => String.empty, onSome: ({ text }) => text }),
    );

const writerTitle = titleBy("writer");
const aiTitle = titleBy("ai");

const TitleField = (): ReactNode => {
  const { title, rename } = useTitle();
  const written = writerTitle(title);
  const onBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      rename(event.currentTarget.value);
    },
    [rename],
  );
  return (
    <input
      key={written}
      aria-label={LABEL}
      className="placeholder:text-muted-foreground w-80 bg-transparent text-sm font-bold outline-none placeholder:font-normal"
      defaultValue={written}
      placeholder={aiTitle(title)}
      onBlur={onBlur}
    />
  );
};

export { TitleField };
