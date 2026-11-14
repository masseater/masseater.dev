import { Array as Arr, Option, String as Str, pipe } from "effect";
import type { ReactNode } from "react";

import { phrased } from "#/pages/interview/lib/phrases";
import { useInterim, usePanel, useStage } from "#/pages/interview/model/hooks";

const LiveLine = (): ReactNode => {
  const interim = useInterim();
  const last = pipe(
    Arr.last(useStage().said),
    Option.match({ onNone: () => "", onSome: (entry) => entry.text }),
  );
  const text = pipe(
    Option.liftPredicate(interim, Str.isNonEmpty),
    Option.getOrElse(() => last),
  );
  const hidden = usePanel() === "transcript" || text === "";
  return (
    !hidden && (
      <p className="text-muted-foreground border-foreground line-clamp-2 border-l-2 pl-3 text-sm lg:hidden">
        {phrased(text)}
      </p>
    )
  );
};

export { LiveLine };
