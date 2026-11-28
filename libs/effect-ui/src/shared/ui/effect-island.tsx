import { Effect, Fiber, Layer } from "effect";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

export const EffectIsland = ({
  mount,
}: Readonly<{ mount: (container: HTMLElement) => Layer.Layer<never> }>): ReactNode => {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = container.current;
    if (host === null) {
      return;
    }
    const fiber = Effect.runFork(Layer.launch(mount(host)));
    return () => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, [mount]);
  return <div ref={container} />;
};
