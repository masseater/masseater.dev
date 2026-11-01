import { Array as Arr, Effect, Option, pipe } from "effect";

import type { GpuEffect, GpuPass, Pass } from "#/features/dance-stage/model/effect";

import type { Fn } from "./fn";
import type { Size } from "./gl";
import { BLOCK_BYTES, emptyBlock, fillBlock, fillTextWidths, POSE_SIZE } from "./gpu-block";
import { densityOf, encodeComputes } from "./gpu-compute";
import { inputGroup, sharedGroup, writeTarget } from "./gpu-groups";
import type { Context, Images, Sizes, Stage } from "./gpu-groups";
import { blockOf, extentOf, unavailable, GROUPS, imageOf, setUp, targetsOf } from "./gpu-setup";
import type { GpuUnavailable, Setup } from "./gpu-setup";
import type { Asset, Frame, Renderer, Source } from "./renderer";

const TRIANGLE = 3;
const NEXT = 1;
const FIRST_TICK = 0;
const EMPTY = 1;
const START = 0;

const replaceImage: Fn<
  Readonly<{ context: Context; key: keyof Images; size: Size }>,
  GPUTexture
> = ({ context, key, size }) => {
  context.images[key].destroy();
  const texture = imageOf({ device: context.device, size });
  context.images[key] = texture;
  return texture;
};

const copyVideo: Fn<Readonly<{ context: Context; video: HTMLVideoElement }>, void> = ({
  context,
  video,
}) => {
  if (video.seeking || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return;
  }
  const size: Size = [video.videoWidth, video.videoHeight];
  const current = context.images.dance;
  const texture = Option.getOrElse(
    Option.liftPredicate(
      current,
      ({ width, height }) => width === video.videoWidth && height === video.videoHeight,
    ),
    () => replaceImage({ context, key: "dance", size }),
  );
  Effect.runFork(
    Effect.try(() => {
      context.device.queue.copyExternalImageToTexture(
        { source: video },
        { texture },
        extentOf(size),
      );
    }).pipe(
      Effect.matchEffect({
        onFailure: (error) =>
          Effect.logDebug("動画のフレームをまだ取れないので前のフレームを使う", error),
        onSuccess: () => Effect.void,
      }),
    ),
  );
};

const viewOf: Fn<Readonly<{ context: Context; stage: Stage }>, GPUTextureView> = ({
  context,
  stage,
}) =>
  pipe(
    writeTarget({ stage, tick: context.clock.tick }),
    Option.getOrElse(() => context.surface.getCurrentTexture()),
  ).createView();

const encodeStage: Fn<
  Readonly<{
    context: Context;
    encoder: GPUCommandEncoder;
    stage: Stage;
    index: number;
    frame: Frame;
  }>,
  void
> = ({ context, encoder, stage, index, frame }) => {
  const { data, lastPose } = context;
  context.device.queue.writeBuffer(
    stage.block,
    START,
    fillBlock({ data, frame, lastPose, size: stage.size }),
  );
  const pass = encoder.beginRenderPass({
    colorAttachments: [{ view: viewOf({ context, stage }), loadOp: "clear", storeOp: "store" }],
  });
  pass.setPipeline(stage.pipeline);
  pass.setBindGroup(GROUPS.shared, sharedGroup({ context, stage }));
  pass.setBindGroup(GROUPS.inputs, inputGroup({ context, stage, index }));
  pass.draw(TRIANGLE);
  pass.end();
};

const start: Fn<Readonly<{ context: Context; frame: Frame }>, void> = ({ context, frame }) => {
  const { device, format } = context.setup;
  context.surface.configure({ device, format, alphaMode: "opaque" });
  context.lastPose.set(frame.pose);
};

const encodeCompute: Fn<
  Readonly<{ context: Context; encoder: GPUCommandEncoder; frame: Frame }>,
  void
> = ({ context, encoder, frame }) => {
  const { device, data, lastPose, setup, computeBlock, density, sampler, images } = context;
  device.queue.writeBuffer(
    computeBlock,
    START,
    fillBlock({ data, frame, lastPose, size: context.screen }),
  );
  encodeComputes({
    device,
    encoder,
    layout: setup.computeLayout,
    stages: setup.computes,
    block: computeBlock,
    density,
    sampler,
    dance: images.dance,
  });
};

const draw: Fn<Readonly<{ context: Context; video: HTMLVideoElement; frame: Frame }>, void> = ({
  context,
  video,
  frame,
}) => {
  copyVideo({ context, video });
  if (context.clock.tick === FIRST_TICK) {
    start({ context, frame });
  }
  const encoder = context.device.createCommandEncoder();
  encodeCompute({ context, encoder, frame });
  for (const [index, stage] of context.stages.entries()) {
    encodeStage({ context, encoder, stage, index, frame });
  }
  context.device.queue.submit([encoder.finish()]);
  context.lastPose.set(frame.pose);
  context.clock.tick += NEXT;
};

const upload: Fn<Readonly<{ context: Context; asset: Asset; source: Source }>, void> = ({
  context,
  asset,
  source,
}) => {
  const size: Size = [source.width, source.height];
  const texture = replaceImage({ context, key: asset, size });
  context.device.queue.copyExternalImageToTexture({ source }, { texture }, extentOf(size));
};

const stagesOf: Fn<
  Readonly<{ setup: Setup; passes: readonly Pass[]; gpu: readonly GpuPass[]; sizes: Sizes }>,
  readonly Stage[]
> = ({ setup: { device, pipelines }, passes, gpu, sizes }) =>
  Arr.zipWith(Arr.zip(passes, gpu), pipelines, ([pass, code], pipeline): Stage => {
    const size = Option.match(pass.target, {
      onNone: () => sizes.screen,
      onSome: () => sizes.offscreen,
    });
    return {
      pass,
      gpu: code,
      pipeline,
      size,
      block: blockOf({ device, bytes: BLOCK_BYTES }),
      targets: targetsOf({ device, pass, size }),
    };
  });

const contextOf: Fn<
  Readonly<{
    setup: Setup;
    surface: GPUCanvasContext;
    passes: readonly Pass[];
    gpu: GpuEffect;
    sizes: Sizes;
  }>,
  Context
> = ({ setup, surface, passes, gpu, sizes }) => {
  const { device, sharedLayout } = setup;
  const empty = (): GPUTexture => imageOf({ device, size: [EMPTY, EMPTY] });
  return {
    device,
    setup,
    surface,
    density: densityOf({ device, used: Arr.isReadonlyArrayNonEmpty(gpu.computes) }),
    computeBlock: blockOf({ device, bytes: BLOCK_BYTES }),
    screen: sizes.screen,
    sampler: device.createSampler({ magFilter: "linear", minFilter: "linear" }),
    sharedLayout,
    images: { dance: empty(), history: empty(), glyphs: empty() },
    stages: stagesOf({ setup, passes, gpu: gpu.passes, sizes }),
    data: emptyBlock(),
    lastPose: new Float32Array(POSE_SIZE),
    clock: { tick: FIRST_TICK },
  };
};

const rendererOf: Fn<Context, Renderer> = (context) => ({
  draw: ({ video, frame }) => {
    draw({ context, video, frame });
  },
  upload: ({ asset, source }) => {
    upload({ context, asset, source });
  },
  setTextWidths: (widths) => {
    fillTextWidths({ data: context.data, widths });
  },
  dispose: () => {
    context.device.destroy();
  },
});

const surfaceOf: Fn<
  Readonly<{ canvas: HTMLCanvasElement; screen: Size }>,
  Effect.Effect<GPUCanvasContext, GpuUnavailable>
> = ({ canvas, screen: [width, height] }) =>
  Effect.suspend(() => {
    canvas.width = width;
    canvas.height = height;
    return Effect.fromOption(Option.fromNullishOr(canvas.getContext("webgpu"))).pipe(
      Effect.mapError(unavailable("canvas")),
    );
  });

const createGpuRenderer: Fn<
  Readonly<{ canvas: HTMLCanvasElement; passes: readonly Pass[]; gpu: GpuEffect }> & Sizes,
  Effect.Effect<Renderer, GpuUnavailable>
> = ({ canvas, passes, gpu, offscreen, screen }) =>
  Effect.gen(function* buildRenderer() {
    const setup = yield* setUp({ passes, gpu });
    const surface = yield* surfaceOf({ canvas, screen });
    return rendererOf(contextOf({ setup, surface, passes, gpu, sizes: { offscreen, screen } }));
  });

export { createGpuRenderer };
