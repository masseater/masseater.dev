import type { PortalResult } from "./result.ts";

export interface SlidesRpc extends Rpc.WorkerEntrypointBranded {
  search: (query: string, limit: number) => Promise<PortalResult>;
}
