import { video } from "#/entities/catalog/model/video.table";

export type VideoKind = (typeof video.$inferSelect)["kind"];

export const VIDEO_KINDS: readonly VideoKind[] = video.kind.enumValues;

export const VIDEO_KIND_LABEL: Readonly<Record<VideoKind, string>> = {
  medley: "メドレー",
  collab: "合作",
  single: "単品",
  other: "その他",
};
