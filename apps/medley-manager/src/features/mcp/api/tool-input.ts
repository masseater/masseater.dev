import { Schema } from "effect";

import { VIDEO_KINDS } from "#/entities/catalog";

const MIN_ID = 1;

const Id = Schema.Int.check(Schema.isGreaterThanOrEqualTo(MIN_ID));
const Text = Schema.optionalKey(Schema.String);
const ClearableText = Schema.optionalKey(Schema.NullOr(Schema.String));
const Kind = Schema.Literals(VIDEO_KINDS).annotate({
  description: "medley=メドレー、collab=合作、single=単品、other=その他",
});
const Names = Schema.optionalKey(Schema.Array(Schema.String));

const IdInput = Schema.Struct({ id: Id });
const KeywordInput = Schema.Struct({
  keyword: Text.annotate({ description: "部分一致で探す語。省略するとすべて" }),
});
const VideoSearchInput = Schema.Struct({
  keyword: Text.annotate({ description: "タイトル・動画 ID・投稿者の部分一致" }),
  kind: Schema.optionalKey(Kind),
});

const CreateSongInput = Schema.Struct({
  title: Schema.NonEmptyString,
  artist: Text.annotate({ description: "作曲者やアーティスト" }),
  url: Text.annotate({ description: "原曲のニコニコ動画か YouTube のリンク" }),
  genre: Text.annotate({ description: "ボカロ、東方、アニソンなど" }),
  note: Text,
  aliases: Names.annotate({ description: "別表記" }),
});
const UpdateSongInput = Schema.Struct({
  id: Id,
  title: Schema.optionalKey(Schema.NonEmptyString),
  artist: ClearableText,
  url: ClearableText,
  genre: ClearableText,
  note: ClearableText,
});
const SongAliasInput = Schema.Struct({ songId: Id, alias: Schema.NonEmptyString });
const MergeInput = Schema.Struct({
  sourceId: Id.annotate({ description: "消す側の ID" }),
  targetId: Id.annotate({ description: "残す側の ID" }),
});

const THUMBNAIL_URL_DESCRIPTION =
  "サムネイル画像の URL。ニコニコ動画は https://ext.nicovideo.jp/api/getthumbinfo/<動画ID> の thumbnail_url、YouTube は https://i.ytimg.com/vi/<動画ID>/mqdefault.jpg";

const CreateVideoInput = Schema.Struct({
  title: Schema.NonEmptyString,
  kind: Schema.optionalKey(Kind),
  url: Schema.NonEmptyString.annotate({
    description: "元動画の URL。ニコニコ動画か YouTube の視聴ページ",
  }),
  videoId: Text.annotate({ description: "sm12345678 や YouTube の ID。省略すると URL から取る" }),
  uploader: Text,
  publishedAt: Text.annotate({ description: "投稿日（YYYY-MM-DD）" }),
  thumbnailUrl: Text.annotate({ description: THUMBNAIL_URL_DESCRIPTION }),
  note: Text,
});
const UpdateVideoInput = Schema.Struct({
  id: Id,
  title: Schema.optionalKey(Schema.NonEmptyString),
  kind: Schema.optionalKey(Kind),
  videoId: ClearableText,
  url: Schema.optionalKey(Schema.NonEmptyString),
  uploader: ClearableText,
  publishedAt: ClearableText,
  thumbnailUrl: ClearableText.annotate({ description: THUMBNAIL_URL_DESCRIPTION }),
  note: ClearableText,
  comment: ClearableText.annotate({ description: "持ち主のメモ。null で消す" }),
});

const PartInput = Schema.Struct({
  songId: Schema.optionalKey(Id),
  songTitle: Text.annotate({
    description: "使用曲の曲名。曲名か別表記が完全に一致する曲につなぎ、無ければ曲を作る",
  }),
  refVideoId: Schema.optionalKey(Id),
  refVideoTitle: Text.annotate({
    description: "引用元の動画のタイトルか動画 ID。一致しなければ URL 未登録のメドレーとして作る",
  }),
  label: Text.annotate({ description: "パート名の原文の表記" }),
  bpm: Text.annotate({ description: "範囲や複数の値もそのまま書く（例: 140-230）" }),
  bars: Text.annotate({ description: "小節数。複合の表記もそのまま書く（例: 8+16）" }),
  startSec: Schema.optionalKey(Schema.Finite),
  endSec: Schema.optionalKey(Schema.Finite),
  note: Text,
  comment: ClearableText,
  audioStaff: Names.annotate({
    description: "音声の担当者。名前か別名義が一致する人につなぎ、無ければ作る",
  }),
  videoStaff: Names.annotate({ description: "映像の担当者。音声と同じようにつなぐ" }),
});
const VideoPartsInput = Schema.Struct({ videoId: Id, parts: Schema.Array(PartInput) });
const UpdatePartInput = Schema.Struct({ partId: Id, ...PartInput.fields });
const PartIdInput = Schema.Struct({ partId: Id });

export {
  CreateSongInput,
  CreateVideoInput,
  IdInput,
  KeywordInput,
  MergeInput,
  PartIdInput,
  PartInput,
  SongAliasInput,
  UpdatePartInput,
  UpdateSongInput,
  UpdateVideoInput,
  VideoPartsInput,
  VideoSearchInput,
};
