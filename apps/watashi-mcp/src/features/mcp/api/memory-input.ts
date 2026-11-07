import { Schema } from "effect";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MIN_LIMIT = 1;

const Project = Schema.NonEmptyString.annotate({
  description: "記憶の持ち主のプロジェクト。リポジトリ名や claude.ai のプロジェクト名",
});
const Name = Schema.NonEmptyString.annotate({
  description: "プロジェクトの中で記憶を一意に指す短い名前（kebab-case）",
});
const Description = Schema.NonEmptyString.annotate({
  description: "検索結果で中身を読むかを決めるための一行の要約",
});
const Content = Schema.NonEmptyString.annotate({ description: "記憶の本文（Markdown）" });
const LimitRange = Schema.isBetween({ minimum: MIN_LIMIT, maximum: MAX_LIMIT });
const Limit = Schema.Int.check(LimitRange).annotate({
  description: `返す件数。既定は ${DEFAULT_LIMIT}`,
});

const SaveInput = Schema.Struct({
  project: Project,
  name: Name,
  description: Description,
  content: Content,
});

const UpdateInput = Schema.Struct({
  project: Project,
  name: Name,
  description: Schema.optionalKey(Description),
  content: Schema.optionalKey(Content),
});

const SearchInput = Schema.Struct({
  query: Schema.String.annotate({
    description:
      "空白で区切った語。どれかを名前・要約・本文に部分一致で含む記憶を、一致した語の多い順に返す。空にすると新しい順",
  }),
  project: Schema.optionalKey(Project),
  limit: Schema.optionalKey(Limit),
});

export { DEFAULT_LIMIT, SaveInput, SearchInput, UpdateInput };
