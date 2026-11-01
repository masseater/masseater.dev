import { Array as Arr, Number as Num, pipe } from "effect";

import { SCREEN } from "#/features/dance-stage/model/effect";
import type { GpuCompute } from "#/features/dance-stage/model/effect";

import type { Fn } from "./fn";

const ENTRY = "main";
const CHANNELS = 2;
const EMPTY_BYTES = 8;
const START = 0;
const BINDINGS = { block: 0, density: 1, sampler: 2, dance: 3 } as const;

type ComputeStage = Readonly<{ pipeline: GPUComputePipeline; workgroups: number }>;

const computeLayoutOf: Fn<GPUDevice, GPUBindGroupLayout> = (device) =>
  device.createBindGroupLayout({
    entries: [
      {
        binding: BINDINGS.block,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "read-only-storage" },
      },
      {
        binding: BINDINGS.density,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
      { binding: BINDINGS.sampler, visibility: GPUShaderStage.COMPUTE, sampler: {} },
      {
        binding: BINDINGS.dance,
        visibility: GPUShaderStage.COMPUTE,
        texture: { sampleType: "float" },
      },
    ],
  });

const computePipelinesOf: Fn<
  Readonly<{ device: GPUDevice; layout: GPUBindGroupLayout; computes: readonly GpuCompute[] }>,
  Promise<readonly GPUComputePipeline[]>
> = ({ device, layout, computes }) => {
  const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [layout] });
  return Promise.all(
    pipe(
      computes,
      Arr.map(({ code }) =>
        device.createComputePipelineAsync({
          layout: pipelineLayout,
          compute: { module: device.createShaderModule({ code }), entryPoint: ENTRY },
        }),
      ),
    ),
  );
};

const densityOf: Fn<Readonly<{ device: GPUDevice; used: boolean }>, GPUBuffer> = ({
  device,
  used,
}) => {
  const full = SCREEN.width * SCREEN.height * CHANNELS * Uint32Array.BYTES_PER_ELEMENT;
  return device.createBuffer({
    size: Math.max(Number(used) * full, EMPTY_BYTES),
    usage: Num.sumAll([GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST]),
  });
};

const encodeComputes: Fn<
  Readonly<{
    device: GPUDevice;
    encoder: GPUCommandEncoder;
    layout: GPUBindGroupLayout;
    stages: readonly ComputeStage[];
    block: GPUBuffer;
    density: GPUBuffer;
    sampler: GPUSampler;
    dance: GPUTexture;
  }>,
  void
> = ({ device, encoder, layout, stages, block, density, sampler, dance }) => {
  if (Arr.isReadonlyArrayEmpty(stages)) {
    return;
  }
  encoder.clearBuffer(density);
  const group = device.createBindGroup({
    layout,
    entries: [
      { binding: BINDINGS.block, resource: { buffer: block } },
      { binding: BINDINGS.density, resource: { buffer: density } },
      { binding: BINDINGS.sampler, resource: sampler },
      { binding: BINDINGS.dance, resource: dance.createView() },
    ],
  });
  const pass = encoder.beginComputePass();
  pass.setBindGroup(START, group);
  for (const { pipeline, workgroups } of stages) {
    pass.setPipeline(pipeline);
    pass.dispatchWorkgroups(workgroups);
  }
  pass.end();
};

export type { ComputeStage };
export { computeLayoutOf, computePipelinesOf, densityOf, encodeComputes };
