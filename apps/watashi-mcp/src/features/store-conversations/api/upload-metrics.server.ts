import { Context } from "effect";

export type MetricsSink = Pick<AnalyticsEngineDataset, "writeDataPoint">;

export class UploadMetrics extends Context.Service<UploadMetrics, MetricsSink>()(
  "watashi-mcp/features/store-conversations/api/upload-metrics.server/UploadMetrics",
) {}
