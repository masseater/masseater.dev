import { Effect, Option, Schema, flow } from "effect";

import { releaseOnUnmount, whileMounted } from "./gpu-lifetime";
import { destroyDevice, trackDevice } from "./gpu-telemetry";

interface Gpu {
  readonly device: GPUDevice;
  readonly context: GPUCanvasContext;
  readonly format: GPUTextureFormat;
}

const taggedError = Schema.TaggedError;

class GpuRequestFailed extends taggedError<GpuRequestFailed, { readonly brand: unique symbol }>()(
  "GpuRequestFailed",
  { step: Schema.String },
) {}

const requestDevice = (): Effect.Effect<Option.Option<GPUDevice>> =>
  Effect.gen(function* request() {
    if (!("gpu" in navigator)) {
      return Option.none();
    }
    const adapter = yield* Effect.tryPromise({
      try: () => navigator.gpu.requestAdapter(),
      catch: () => GpuRequestFailed.make({ step: "adapter" }),
    });
    if (adapter === null) {
      return Option.none();
    }
    const device = yield* Effect.tryPromise({
      try: () => adapter.requestDevice(),
      catch: () => GpuRequestFailed.make({ step: "device" }),
    });
    return Option.some(device);
  }).pipe(Effect.orElseSucceed(() => Option.none()));

const configure = (canvas: HTMLCanvasElement, device: GPUDevice): Option.Option<Gpu> =>
  Option.match(Option.fromNullishOr(canvas.getContext("webgpu")), {
    onNone: () => {
      destroyDevice(device);
      return Option.none();
    },
    onSome: (context) => {
      const format = navigator.gpu.getPreferredCanvasFormat();
      context.configure({ device, format, alphaMode: "premultiplied" });
      return Option.some({ device, context, format });
    },
  });

const acquireGpu = ({
  canvas,
  signal,
}: Readonly<{ canvas: HTMLCanvasElement; signal: AbortSignal }>): Effect.Effect<
  Option.Option<Gpu>
> => {
  const mounted = whileMounted(signal);
  const held = releaseOnUnmount(signal);
  return Effect.map(
    requestDevice(),
    flow(
      Option.flatMap(mounted),
      Option.map(trackDevice),
      Option.flatMap((device) => configure(canvas, device)),
      Option.map(held),
    ),
  ).pipe(Effect.withSpan("mosaic.gpu.acquire"));
};

export type { Gpu };
export { acquireGpu };
