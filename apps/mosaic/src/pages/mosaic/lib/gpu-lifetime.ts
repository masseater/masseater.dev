import { Option, Predicate } from "effect";

interface Held {
  readonly device: Pick<GPUDevice, "destroy">;
  readonly context: Pick<GPUCanvasContext, "unconfigure">;
}

const whileMounted =
  (signal: AbortSignal) =>
  <Device extends Held["device"]>(device: Device): Option.Option<Device> => {
    if (signal.aborted) {
      device.destroy();
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
        gpu.device.destroy();
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
