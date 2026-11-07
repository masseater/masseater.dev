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

const readonlyParameterAllow = [
  {
    from: "lib" as const,
    name: ["HTMLElement", "ReadableStream", "Request", "Float64Array", ...BROWSER_HANDLES],
  },
  { from: "package" as const, package: "@webgpu/types", name: [...WEBGPU_HANDLES] },
  {
    from: "package" as const,
    package: "@cloudflare/workers-types",
    name: [
      "AnalyticsEngineDataset",
      "Container",
      "DurableObjectState",
      "DurableObjectStorage",
      "KVNamespace",
      "R2Bucket",
      "SecretsStoreSecret",
    ],
  },
  { from: "package" as const, package: "@alchemy.run/cloudflare", name: "Store" },
  { from: "package" as const, package: "@tanstack/query-core", name: "QueryClient" },
  {
    from: "package" as const,
    package: "react",
    name: ["ReactNode", "ButtonHTMLAttributes", "ClassAttributes"],
  },
  { from: "package" as const, package: "clsx", name: "ClassValue" },
  { from: "package" as const, package: "discord.js", name: ["Client", "Guild"] },
  {
    from: "package" as const,
    package: "@discordjs/voice",
    name: ["AudioPlayer", "VoiceConnection"],
  },
  { from: "package" as const, package: "mdast", name: ["Root", "RootContent", "Yaml"] },
  { from: "package" as const, package: "vfile", name: "VFile" },
  {
    from: "package" as const,
    package: "effect",
    name: ["Cause", "Context", "Effect", "Exit", "Layer", "Option", "Redacted", "Stream", "Utc"],
  },
];

export { readonlyParameterAllow };
