import { Array, Option, pipe } from "effect";
import { constVoid } from "effect/Function";
import { useCallback } from "react";
import type { ReactNode, RefCallback } from "react";

const NextPageTrigger = ({ onVisible }: Readonly<{ onVisible: () => void }>): ReactNode => {
  const watch: RefCallback<HTMLDivElement> = useCallback(
    (element) => {
      const observer = new IntersectionObserver((entries) => {
        if (
          pipe(
            entries,
            Array.some(({ isIntersecting }) => isIntersecting),
          )
        ) {
          onVisible();
        }
      });
      return Option.match(Option.fromNullOr(element), {
        onNone: () => constVoid,
        onSome: (target) => {
          observer.observe(target);
          return () => {
            observer.disconnect();
          };
        },
      });
    },
    [onVisible],
  );
  return <div ref={watch} className="h-px shrink-0" />;
};

export { NextPageTrigger };
