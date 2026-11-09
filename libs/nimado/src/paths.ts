import type { PlatformName } from "./published.ts";

const DATA_DIR = "data";

const DATA_WORKER = "nimado-data";

const SHARD_SIZE = 1000;

const VIEW_THRESHOLD = 10_000;

const YOUTUBE_RETENTION_DAYS = 30;

const metaPath = `${DATA_DIR}/meta.json`;

const tablePath = `${DATA_DIR}/table.json`;

const shardOf = (songId: number): number => Math.floor(songId / SHARD_SIZE);

const shardPath = (shard: number): string => `${DATA_DIR}/songs/${shard.toString()}.json`;

const daysDir = (platform: PlatformName): string => `${DATA_DIR}/days/${platform}`;

const dayPath = ({ platform, date }: Readonly<{ platform: PlatformName; date: string }>): string =>
  `${daysDir(platform)}/${date}.json`;

export {
  DATA_DIR,
  DATA_WORKER,
  SHARD_SIZE,
  VIEW_THRESHOLD,
  YOUTUBE_RETENTION_DAYS,
  dayPath,
  daysDir,
  metaPath,
  shardOf,
  shardPath,
  tablePath,
};
