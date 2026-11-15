import type { SyncStatus } from "@masseater.dev/yohaku-protocol";
import { Option, pipe } from "effect";
import { CloudAlert, CloudCheck } from "lucide-react";
import type { ReactNode } from "react";

const SYNCED = "同期済み";
const SYNCING = "同期中";
const FAILED = "同期できていません";

const clock = new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit" });

const syncedLabel = (syncedAt: number | null): string =>
  pipe(
    Option.fromNullishOr(syncedAt),
    Option.map((at) => `${SYNCED} ${clock.format(at)}`),
    Option.getOrElse(() => SYNCING),
  );

const Failed = ({ problem }: Readonly<{ problem: string }>): ReactNode => (
  <span className="text-destructive flex items-center gap-1.5 text-sm" title={problem}>
    <CloudAlert aria-hidden="true" className="size-4" />
    {FAILED}
  </span>
);

const SyncState = ({ status }: Readonly<{ status: typeof SyncStatus.Type }>): ReactNode =>
  pipe(
    Option.fromNullishOr(status.problem),
    Option.match({
      onSome: (problem) => <Failed problem={problem} />,
      onNone: () => (
        <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <CloudCheck aria-hidden="true" className="size-4" />
          {syncedLabel(status.syncedAt)}
        </span>
      ),
    }),
  );

export { SyncState };
