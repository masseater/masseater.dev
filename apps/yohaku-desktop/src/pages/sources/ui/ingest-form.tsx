import { Button } from "@masseater.dev/ui/button";
import type { ReactNode } from "react";

import { useIngest } from "#/pages/sources/api/sources.ts";

const FIELD = "text";

const IngestForm = (): ReactNode => {
  const { ingest, pending } = useIngest();
  return (
    <form
      className="flex flex-col gap-2.5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const text = new FormData(form).get(FIELD);
        if (typeof text === "string" && text.trim() !== "") {
          ingest(text);
          form.reset();
        }
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className="font-bold">URL か文章</span>
        <textarea
          name={FIELD}
          rows={4}
          className="resize-none rounded-md border px-2.5 py-2 text-sm"
        />
      </label>
      <Button type="submit" disabled={pending}>
        取り込む
      </Button>
    </form>
  );
};

export { IngestForm };
