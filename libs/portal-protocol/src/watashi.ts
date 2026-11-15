import type { PortalResult } from "./result.ts";

interface WatashiPortalRpc extends Rpc.WorkerEntrypointBranded {
  lifeRead: (input: unknown) => Promise<PortalResult>;
  memoryRead: (input: unknown) => Promise<PortalResult>;
  memoryWrite: (input: unknown) => Promise<PortalResult>;
  memoryProjects: () => Promise<PortalResult>;
  profile: (input: unknown) => Promise<PortalResult>;
  conversationRead: (input: unknown) => Promise<PortalResult>;
}

const PORTAL_ACTOR = "portal";

export { PORTAL_ACTOR };
export type { WatashiPortalRpc };
