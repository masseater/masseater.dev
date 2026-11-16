import type { PortalResult } from "#/shared/lib/result.ts";

export interface WatashiPortalRpc extends Rpc.WorkerEntrypointBranded {
  lifeRead: (input: unknown) => Promise<PortalResult>;
  memoryRead: (input: unknown) => Promise<PortalResult>;
  memoryWrite: (input: unknown) => Promise<PortalResult>;
  memoryProjects: () => Promise<PortalResult>;
  profile: () => Promise<PortalResult>;
  conversationRead: (input: unknown) => Promise<PortalResult>;
}

export const PORTAL_ACTOR = "portal";
