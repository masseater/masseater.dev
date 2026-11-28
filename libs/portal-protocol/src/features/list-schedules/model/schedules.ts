export type ScheduleRun = Readonly<{
  id: number;
  slot: number | null;
  createdAt: number;
  takenAt: number | null;
  repliedAt: number | null;
  threadUrl: string | null;
  reply: string | null;
}>;

export type ScheduleView = Readonly<{
  id: string;
  name: string;
  description: string;
  cron: string;
  timezone: string;
  project: string | null;
  model: string | null;
  prompt: string;
  enabled: boolean;
  updatedAt: number;
  nextRun: number | null;
  lastRun: ScheduleRun | null;
}>;

export interface SchedulesRpc extends Rpc.WorkerEntrypointBranded {
  list: () => Promise<readonly ScheduleView[]>;
}
