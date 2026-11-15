import type { PlatformName } from "./published.ts";

export const DATA_DIR = "data";

export const DATA_WORKER = "nimado-data";

export const SHARD_SIZE = 1000;

export const VIEW_THRESHOLD = 10_000;

export const YOUTUBE_RETENTION_DAYS = 30;

export const metaPath = `${DATA_DIR}/meta.json`;

export const tablePath = `${DATA_DIR}/table.json`;

export const shardOf = (songId: number): number => Math.floor(songId / SHARD_SIZE);

export const shardPath = (shard: number): string => `${DATA_DIR}/songs/${shard.toString()}.json`;

export const daysDir = (platform: PlatformName): string => `${DATA_DIR}/days/${platform}`;

export const dayPath = ({
  platform,
  date,
}: Readonly<{ platform: PlatformName; date: string }>): string =>
  `${daysDir(platform)}/${date}.json`;
