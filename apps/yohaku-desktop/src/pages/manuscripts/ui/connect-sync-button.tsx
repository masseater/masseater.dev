import { Button } from "@masseater.dev/ui/button";
import { Cloud } from "lucide-react";
import type { ReactNode } from "react";

import { useSyncSignIn } from "#/pages/manuscripts/api/sync.ts";

const LABEL = "同期を始める";

const ConnectSyncButton = (): ReactNode => {
  const { connect, pending } = useSyncSignIn();
  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={connect}>
      <Cloud aria-hidden="true" />
      {LABEL}
    </Button>
  );
};

export { ConnectSyncButton };
