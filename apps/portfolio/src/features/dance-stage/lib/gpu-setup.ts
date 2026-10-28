import { Array as Arr, Effect, Number as Num, Option, Schema, pipe } from "effect";

import type { GpuEffect, GpuPass, Pass } from "#/features/dance-stage/model/effect";

import type { Fn } from "./fn";
import type { Size } from "./gl";
import { computeLayoutOf, computePipelinesOf } from "./gpu-compute";
import type { ComputeStage } from "./gpu-compute";

const VERTEX = `
struct Corner {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn main(@builtin(vertex_index) index: u32) -> Corner {
  let corner = vec2<f32>(f32((index << 1u) & 2u), f32(index & 2u)) * 2.0 - 1.0;
  return Corner(vec4<f32>(corner, 0.0, 1.0), vec2<f32>(corner.x * 0.5 + 0.5, 0.5 - corner.y * 0.5));
}
`;

const ENTRY = "main";
const TARGET_FORMAT: GPUTextureFormat = "rgba16float";
const IMAGE_FORMAT: GPUTextureFormat = "rgba8unorm";
const PING_PONG = 2;
const SINGLE = 1;
const SHARED = { block: 0, sampler: 1, dance: 2, history: 3, glyphs: 4, density: 5 } as const;
const GROUPS = { shared: 0, inputs: 1 } as const;

const taggedError = Schema.TaggedError;

class GpuUnavailable extends taggedError<GpuUnavailable, { readonly brand: unique symbol }>()(
  "GpuUnavailable",
  { step: Schema.String },
) {}

const unavailable = (step: string) => (): GpuUnavailable => GpuUnavailable.make({ step });

type Setup = Readonly<{
  device: GPUDevice;
  format: GPUTextureFormat;
  sharedLayout: GPUBindGroupLayout;
  pipelines: readonly GPURenderPipeline[];
  computeLayout: GPUBindGroupLayout;
  computes: readonly ComputeStage[];
}>;

type PipelineInput = Readonly<{
  device: GPUDevice;
  sharedLayout: GPUBindGroupLayout;
  vertex: GPUShaderModule;
  gpu: GpuPass;
  format: GPUTextureFormat;
}>;

const textureEntry = (binding: number): GPUBindGroupLayoutEntry => ({
  binding,
  visibility: GPUShaderStage.FRAGMENT,
  texture: { sampleType: "float" },
});

const sharedLayoutOf: Fn<GPUDevice, GPUBindGroupLayout> = (device) =>
  device.createBindGroupLayout({
    entries: [
      {
        binding: SHARED.block,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: "read-only-storage" },
      },
      { binding: SHARED.sampler, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      textureEntry(SHARED.dance),
      textureEntry(SHARED.history),
      textureEntry(SHARED.glyphs),
      {
        binding: SHARED.density,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: "read-only-storage" },
      },
    ],
  });

const inputLayoutOf: Fn<Readonly<{ device: GPUDevice; gpu: GpuPass }>, GPUBindGroupLayout> = ({
  device,
  gpu,
}) => {
  const entries = pipe(
    gpu.inputs,
    Arr.map((_name, binding) => textureEntry(binding)),
  );
  return device.createBindGroupLayout({ entries });
};

const pipelineOf: Fn<PipelineInput, Promise<GPURenderPipeline>> = ({
  device,
  sharedLayout,
  vertex,
  gpu,
  format,
}) => {
  const bindGroupLayouts = [sharedLayout, inputLayoutOf({ device, gpu })];
  const fragment = device.createShaderModule({ code: gpu.code });
  return device.createRenderPipelineAsync({
    layout: device.createPipelineLayout({ bindGroupLayouts }),
    vertex: { module: vertex, entryPoint: ENTRY },
    fragment: { module: fragment, entryPoint: ENTRY, targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });
};

const formatOf: Fn<Readonly<{ pass: Pass; screen: GPUTextureFormat }>, GPUTextureFormat> = ({
  pass,
  screen,
}) =>
  Option.match(pass.target, {
    onNone: () => screen,
    onSome: () => TARGET_FORMAT,
  });

const setUp: Fn<
  Readonly<{ passes: readonly Pass[]; gpu: GpuEffect }>,
  Effect.Effect<Setup, GpuUnavailable>
> = ({ passes, gpu }) =>
  Effect.gen(function* requestGpu() {
    const adapter = yield* Effect.tryPromise({
      try: () => navigator.gpu.requestAdapter(),
      catch: unavailable("adapter"),
    }).pipe(
      Effect.flatMap((found) =>
        Effect.fromOption(Option.fromNullishOr(found)).pipe(
          Effect.mapError(unavailable("adapter")),
        ),
      ),
    );
    const device = yield* Effect.tryPromise({
      try: () => adapter.requestDevice(),
      catch: unavailable("device"),
    });
    const format = navigator.gpu.getPreferredCanvasFormat();
    const sharedLayout = sharedLayoutOf(device);
    const vertex = device.createShaderModule({ code: VERTEX });
    const pipelines = yield* Effect.tryPromise({
      try: () =>
        Promise.all(
          Arr.zipWith(passes, gpu.passes, (pass, code) =>
            pipelineOf({
              device,
              sharedLayout,
              vertex,
              gpu: code,
              format: formatOf({ pass, screen: format }),
            }),
          ),
        ),
      catch: unavailable("pipeline"),
    });
    const computeLayout = computeLayoutOf(device);
    const computePipelines = yield* Effect.tryPromise({
      try: () => computePipelinesOf({ device, layout: computeLayout, computes: gpu.computes }),
      catch: unavailable("compute"),
    });
    const computes = Arr.zipWith(computePipelines, gpu.computes, (pipeline, { workgroups }) => ({
      pipeline,
      workgroups,
    }));
    return { device, format, sharedLayout, pipelines, computeLayout, computes };
  });

const extentOf: Fn<Size, GPUExtent3DDict> = ([width, height]) => ({ width, height });

const imageOf: Fn<Readonly<{ device: GPUDevice; size: Size }>, GPUTexture> = ({ device, size }) =>
  device.createTexture({
    size: extentOf(size),
    format: IMAGE_FORMAT,
    usage: Num.sumAll([
      GPUTextureUsage.TEXTURE_BINDING,
      GPUTextureUsage.COPY_DST,
      GPUTextureUsage.RENDER_ATTACHMENT,
    ]),
  });

const targetCount: Fn<Pass, number> = (pass) => {
  if (pass.persistent) {
    return PING_PONG;
  }
  return SINGLE;
};

const targetsOf: Fn<
  Readonly<{ device: GPUDevice; pass: Pass; size: Size }>,
  readonly GPUTexture[]
> = ({ device, pass, size }) => {
  if (Option.isNone(pass.target)) {
    return [];
  }
  const usage = Num.sumAll([GPUTextureUsage.TEXTURE_BINDING, GPUTextureUsage.RENDER_ATTACHMENT]);
  return Arr.makeBy(targetCount(pass), () =>
    device.createTexture({ size: extentOf(size), format: TARGET_FORMAT, usage }),
  );
};

const blockOf: Fn<Readonly<{ device: GPUDevice; bytes: number }>, GPUBuffer> = ({
  device,
  bytes,
}) =>
  device.createBuffer({
    size: bytes,
    usage: Num.sumAll([GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST]),
  });

export type { GpuUnavailable, Setup };
export {
  blockOf,
  extentOf,
  unavailable,
  GROUPS,
  imageOf,
  PING_PONG,
  setUp,
  SHARED,
  SINGLE,
  targetsOf,
};
