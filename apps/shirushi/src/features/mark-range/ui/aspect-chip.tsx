import { useAtom } from "@effect/atom-react";
import { Array as Arr, pipe } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { aspectsAtom } from "#/features/mark-range/model/draft";
import { ASPECTS, ASPECT_LABELS } from "#protocol";
import type { Aspect } from "#protocol";

import { TOGGLE } from "./toggle.ts";

const toggled = (aspects: readonly Aspect[], aspect: Aspect): readonly Aspect[] =>
  pipe(
    ASPECTS,
    Arr.filter((each) => (each === aspect) !== Arr.contains(aspects, each)),
  );

export const AspectChip = ({ aspect }: Readonly<{ aspect: Aspect }>): ReactNode => {
  const [aspects, setAspects] = useAtom(aspectsAtom);
  const toggle = useCallback(() => {
    setAspects((now) => toggled(now, aspect));
  }, [setAspects, aspect]);
  return (
    <button
      type="button"
      aria-pressed={Arr.contains(aspects, aspect)}
      className={TOGGLE}
      onClick={toggle}
    >
      {ASPECT_LABELS[aspect]}
    </button>
  );
};
