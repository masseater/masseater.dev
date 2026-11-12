import type { SyncStatus } from "@masseater.dev/yohaku-protocol";
import { Option, pipe } from "effect";
import type { ReactNode } from "react";

import { useSyncStatus } from "#/pages/manuscripts/api/sync.ts";

import { ConnectSyncButton } from "./connect-sync-button.tsx";
import { SyncState } from "./sync-state.tsx";

const shown = (status: typeof SyncStatus.Type): ReactNode => {
  if (status.connected) {
    return <SyncState status={status} />;
  }
  return <ConnectSyncButton />;
};

const SyncControl = (): ReactNode => pipe(useSyncStatus(), Option.map(shown), Option.getOrNull);

export { SyncControl };
