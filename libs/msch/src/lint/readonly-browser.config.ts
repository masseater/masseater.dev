const WEBGPU_HANDLES: readonly string[] = [
  "GPUDevice",
  "GPUCanvasContext",
  "GPUTexture",
  "GPUBuffer",
  "GPUBindGroup",
  "GPUBindGroupLayout",
  "GPUPipelineLayout",
  "GPURenderPipeline",
  "GPUSampler",
];

const BROWSER_HANDLES: readonly string[] = [
  "HTMLCanvasElement",
  "HTMLImageElement",
  "HTMLAnchorElement",
  "CanvasRenderingContext2D",
  "PointerEvent",
  "WheelEvent",
  "KeyboardEvent",
  "MouseEvent",
  "AbortSignal",
  "ImageBitmap",
  ...WEBGPU_HANDLES,
];

export { BROWSER_HANDLES, WEBGPU_HANDLES };
