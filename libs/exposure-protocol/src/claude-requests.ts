type ClaudeRequest = Readonly<{ text: string; sender: string }>;

interface ClaudeRequestsRpc extends Rpc.WorkerEntrypointBranded {
  send: (request: ClaudeRequest) => Promise<Readonly<{ id: number; woke: string }>>;
}

export type { ClaudeRequest, ClaudeRequestsRpc };
