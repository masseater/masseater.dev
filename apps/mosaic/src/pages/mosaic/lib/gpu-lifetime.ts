import { Option, Predicate } from "effect";

import { destroyDevice } from "./gpu-telemetry";

interface Held {
  readonly device: Pick<GPUDevice, "destroy">;
  readonly context: Pick<GPUCanvasContext, "unconfigure">;
}

const whileMounted =
  (signal: AbortSignal) =>
  <Device extends Held["device"]>(device: Device): Option.Option<Device> => {
    if (signal.aborted) {
      destroyDevice(device);
      return Option.none();
    }
    return Option.some(device);
  };

const releaseOnUnmount =
  (signal: AbortSignal) =>
  <Gpu extends Held>(gpu: Gpu): Gpu => {
    signal.addEventListener(
      "abort",
      () => {
        gpu.context.unconfigure();
        destroyDevice(gpu.device);
      },
      { once: true },
    );
    return gpu;
  };

type PageEvents = Readonly<Pick<EventTarget, "addEventListener" | "removeEventListener">>;

const whenPersisted =
  (type: "pagehide" | "pageshow") =>
  (page: PageEvents) =>
  (run: () => void): (() => void) => {
    const listener = (event: unknown): void => {
      if (Predicate.hasProperty(event, "persisted") && event.persisted === true) {
        run();
      }
    };
    page.addEventListener(type, listener);
    return () => {
      page.removeEventListener(type, listener);
    };
  };

const onCached = whenPersisted("pagehide");

const onRestored = whenPersisted("pageshow");

export { onCached, onRestored, releaseOnUnmount, whileMounted };
