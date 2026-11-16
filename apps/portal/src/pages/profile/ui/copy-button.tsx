import { Button } from "@masseater.dev/ui/button";
import { Effect } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { markdownOf } from "#/entities/watashi";
import type { ProfileSectionValue } from "#/entities/watashi";

const COPY = "コピー";

export const CopyButton = ({
  sections,
}: Readonly<{ sections: readonly ProfileSectionValue[] }>): ReactNode => {
  const copy = useCallback(() => {
    Effect.runFork(Effect.promise(() => navigator.clipboard.writeText(markdownOf(sections))));
  }, [sections]);
  return (
    <Button className="mb-2" onClick={copy} size="sm" variant="outline">
      {COPY}
    </Button>
  );
};
