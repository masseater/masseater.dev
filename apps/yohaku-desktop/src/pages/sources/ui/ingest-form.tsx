import { Button } from "@masseater.dev/ui/button";
import { Option, Predicate, String, pipe } from "effect";
import { useCallback } from "react";
import type { SubmitEvent, ReactNode } from "react";

import { useIngest } from "#/pages/sources/api/sources.ts";

const FIELD = "text";
const LABEL = "URL か文章";
const SUBMIT = "取り込む";
const ROWS = 4;

const IngestForm = (): ReactNode => {
  const { ingest, pending } = useIngest();
  const onSubmit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const text = pipe(
        Option.fromNullishOr(new FormData(form).get(FIELD)),
        Option.filter(Predicate.isString),
        Option.filter((value) => pipe(value, String.trim, String.isNonEmpty)),
      );
      if (Option.isSome(text)) {
        ingest(text.value);
        form.reset();
      }
    },
    [ingest],
  );
  return (
    <form className="flex flex-col gap-2.5" onSubmit={onSubmit}>
      <label className="flex flex-col gap-1.5">
        <span className="font-bold">{LABEL}</span>
        <textarea
          className="resize-none rounded-md border px-2.5 py-2 text-sm"
          name={FIELD}
          rows={ROWS}
        />
      </label>
      <Button disabled={pending} type="submit">
        {SUBMIT}
      </Button>
    </form>
  );
};

export { IngestForm };
