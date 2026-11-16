import { Array as Arr, Option, pipe } from "effect";

import type { GpuPass, Pass } from "#/entities/dance-effect/index.ts";

import type { Fn } from "./fn.ts";
import type { Size } from "./gl.ts";
import { GROUPS, PING_PONG, SHARED, SINGLE } from "./gpu-setup.ts";
import type { Setup } from "./gpu-setup.ts";
import type { Asset } from "./renderer.ts";

const NEXT = 1;

export type Images = Record<"dance" | Asset, GPUTexture>;

export type Stage = Readonly<{
  pass: Pass;
  gpu: GpuPass;
  pipeline: GPURenderPipeline;
  size: Size;
  block: GPUBuffer;
  targets: readonly GPUTexture[];
}>;

export type Context = Readonly<{
  device: GPUDevice;
  setup: Setup;
  surface: GPUCanvasContext;
  density: GPUBuffer;
  computeBlock: GPUBuffer;
  screen: Size;
  sampler: GPUSampler;
  sharedLayout: GPUBindGroupLayout;
  images: Images;
  stages: readonly Stage[];
  data: Float32Array;
  lastPose: Float32Array;
  clock: { tick: number };
}>;

export type Sizes = Readonly<{ offscreen: Size; screen: Size }>;

export const writeTarget: Fn<
  Readonly<{ stage: Stage; tick: number }>,
  Option.Option<GPUTexture>
> = ({ stage, tick }) => Arr.get(stage.targets, tick % Math.max(stage.targets.length, SINGLE));

const readTarget: Fn<
  Readonly<{ stage: Stage; tick: number; previous: boolean }>,
  Option.Option<GPUTexture>
> = ({ stage, tick, previous }) => {
  if (stage.pass.persistent && previous) {
    return Arr.get(stage.targets, (tick + NEXT) % PING_PONG);
  }
  return writeTarget({ stage, tick });
};

const inputTexture: Fn<Readonly<{ context: Context; index: number; name: string }>, GPUTexture> = ({
  context: { stages, clock, images },
  index,
  name,
}) =>
  pipe(
    Arr.findFirstIndex(stages, (other) => Option.contains(other.pass.target, name)),
    Option.flatMap((position) =>
      Option.flatMap(Arr.get(stages, position), (other) =>
        readTarget({ stage: other, tick: clock.tick, previous: position >= index }),
      ),
    ),
    Option.getOrElse(() => images.history),
  );

export const sharedGroup: Fn<Readonly<{ context: Context; stage: Stage }>, GPUBindGroup> = ({
  context: { device, sharedLayout, sampler, images, density },
  stage,
}) =>
  device.createBindGroup({
    layout: sharedLayout,
    entries: [
      { binding: SHARED.block, resource: { buffer: stage.block } },
      { binding: SHARED.sampler, resource: sampler },
      { binding: SHARED.dance, resource: images.dance.createView() },
      { binding: SHARED.history, resource: images.history.createView() },
      { binding: SHARED.glyphs, resource: images.glyphs.createView() },
      { binding: SHARED.density, resource: { buffer: density } },
    ],
  });

export const inputGroup: Fn<
  Readonly<{ context: Context; stage: Stage; index: number }>,
  GPUBindGroup
> = ({ context, stage, index }) => {
  const entries = pipe(
    stage.gpu.inputs,
    Arr.map((name, binding) => ({
      binding,
      resource: inputTexture({ context, index, name }).createView(),
    })),
  );
  return context.device.createBindGroup({
    layout: stage.pipeline.getBindGroupLayout(GROUPS.inputs),
    entries,
  });
};
