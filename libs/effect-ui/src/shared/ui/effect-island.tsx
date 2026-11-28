import { Effect, Fiber, Layer, Option, pipe } from "effect";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

export const EffectIsland = ({
  mount,
}: Readonly<{ mount: (container: HTMLElement) => Layer.Layer<never> }>): ReactNode => {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect((): (() => void) => {
    const fiber = pipe(
      Option.fromNullishOr(containerRef.current),
      Option.match({
        onNone: () => Effect.void,
        onSome: (host) => pipe(host, mount, Layer.launch),
      }),
      Effect.runFork,
    );
    return (): void => {
      pipe(fiber, Fiber.interrupt, Effect.runFork);
    };
  }, [mount]);
  return <div ref={containerRef} />;
};
