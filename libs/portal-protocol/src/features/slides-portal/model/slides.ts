import type { PortalResult } from "#/shared/lib/result.ts";

export interface SlidesRpc extends Rpc.WorkerEntrypointBranded {
  search: (query: string, limit: number) => Promise<PortalResult>;
}
