import { video } from "#/entities/catalog/model/video.table";

type VideoKind = (typeof video.$inferSelect)["kind"];

const VIDEO_KINDS: readonly VideoKind[] = video.kind.enumValues;

const VIDEO_KIND_LABEL: Readonly<Record<VideoKind, string>> = {
  medley: "メドレー",
  collab: "合作",
  single: "単品",
  other: "その他",
};

export type { VideoKind };
export { VIDEO_KINDS, VIDEO_KIND_LABEL };
