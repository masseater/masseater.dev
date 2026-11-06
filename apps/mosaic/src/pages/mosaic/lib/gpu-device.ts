import { Effect, Option, Schema } from "effect";

interface Gpu {
  readonly device: GPUDevice;
  readonly context: GPUCanvasContext;
  readonly format: GPUTextureFormat;
}

const taggedError = Schema.TaggedError;

class GpuRequestFailed extends taggedError<GpuRequestFailed, { readonly brand: unique symbol }>()(
  "GpuRequestFailed",
  { reason: Schema.String },
) {}

const requestFailed = (error: unknown): GpuRequestFailed =>
  GpuRequestFailed.make({ reason: String(error) });

const requestDevice = (): Effect.Effect<Option.Option<GPUDevice>> =>
  Effect.gen(function* request() {
    if (!("gpu" in navigator)) {
      return Option.none();
    }
    const adapter = yield* Effect.tryPromise({
      try: () => navigator.gpu.requestAdapter(),
      catch: requestFailed,
    });
    if (adapter === null) {
      return Option.none();
    }
    const device = yield* Effect.tryPromise({
      try: () => adapter.requestDevice(),
      catch: requestFailed,
    });
    return Option.some(device);
  }).pipe(Effect.orElseSucceed(() => Option.none()));

const configure = (canvas: HTMLCanvasElement, device: GPUDevice): Option.Option<Gpu> =>
  Option.map(Option.fromNullishOr(canvas.getContext("webgpu")), (context) => {
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: "premultiplied" });
    return { device, context, format };
  });

const acquireGpu = (canvas: HTMLCanvasElement): Effect.Effect<Option.Option<Gpu>> =>
  Effect.map(
    requestDevice(),
    Option.flatMap((device) => configure(canvas, device)),
  ).pipe(Effect.withSpan("mosaic.gpu.acquire"));

export type { Gpu };
export { acquireGpu };
