type CredentialState = Readonly<{
  id: string;
  kind: "key" | "login";
  status: "stored" | "missing";
  actionUrl: string;
}>;

interface CredentialStatusRpc extends Rpc.WorkerEntrypointBranded {
  list: () => Promise<readonly CredentialState[]>;
}

export type { CredentialState, CredentialStatusRpc };
