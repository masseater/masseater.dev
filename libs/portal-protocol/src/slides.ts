import type { PortalResult } from "./result.ts";

interface SlidesRpc extends Rpc.WorkerEntrypointBranded {
  search: (query: string, limit: number) => Promise<PortalResult>;
}

export type { SlidesRpc };
