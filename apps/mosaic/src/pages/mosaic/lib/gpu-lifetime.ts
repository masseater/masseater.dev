import { Option } from "effect";

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

export { releaseOnUnmount, whileMounted };
