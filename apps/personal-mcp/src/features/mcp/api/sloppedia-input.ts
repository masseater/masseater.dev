import { Schema } from "effect";
import type { SchemaAST } from "effect";

const MAX_TITLE = 60;
const MAX_DESCRIPTION = 120;
const MAX_TAGS = 5;
const MAX_INFOBOX = 10;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const SENTENCE_END = /[。！？]$/u;
const BARE_URL = /(?<!\]\()https?:\/\//u;
const MDX_SYNTAX = /[{}<]/u;
const NUMERIC_FOOTNOTE = /\[\^\d+\]/u;
const TOP_HEADING = /^#\s/mu;
const BOLD_LEAD = /^\s*\*\*/u;
const WEB_URL = /^https?:\/\//u;

const requires = (matches: (text: string) => boolean, message: string): SchemaAST.Filter<string> =>
  Schema.makeFilter<string>((text) => matches(text) || message);

const rejects = (matches: (text: string) => boolean, message: string): SchemaAST.Filter<string> =>
  Schema.makeFilter<string>((text) => !matches(text) || message);

const hasBareUrl = (text: string): boolean => BARE_URL.test(text);

const hasMdxSyntax = (text: string): boolean => MDX_SYNTAX.test(text);

const Slug = Schema.String.check(Schema.isPattern(SLUG)).annotate({
  description: "URLになる英小文字と数字のケバブケース(例: web-dev)。既存のslugなら書き換える",
});

const Title = Schema.NonEmptyString.check(Schema.isMaxLength(MAX_TITLE)).annotate({
  description: "記事名。題材の正式な名前",
});

const Description = Schema.NonEmptyString.check(
  Schema.isMaxLength(MAX_DESCRIPTION),
  requires((text) => SENTENCE_END.test(text), "文末は「。」で終える"),
  rejects(hasBareUrl, "リンクや記号を入れない"),
  rejects(hasMdxSyntax, "リンクや記号を入れない"),
).annotate({ description: "一覧とOGPに出る1文の説明。リンクを入れない平文" });

const Body = Schema.NonEmptyString.check(
  rejects((text) => TOP_HEADING.test(text), "見出しは##から使う。#は記事名が使う"),
  rejects((text) => BOLD_LEAD.test(text), "冒頭の題名を太字にしない"),
  rejects(hasBareUrl, "URLは[語](URL)の形で埋め込む"),
  rejects(hasMdxSyntax, "{ } < はMDXとして解釈されるので使えない"),
  rejects((text) => NUMERIC_FOOTNOTE.test(text), "脚注のラベルは番号でなく名前にする"),
).annotate({ description: "Markdownの本文。frontmatterと記事名の見出しは含めない" });

const Href = Schema.String.check(Schema.isPattern(WEB_URL)).annotate({
  description: "値のリンク先",
});

const InfoboxRow = Schema.Struct({
  label: Schema.NonEmptyString.annotate({ description: "項目名(例: 開発元)" }),
  value: Schema.NonEmptyString.annotate({ description: "値" }),
  href: Schema.optionalKey(Href),
});

const Tags = Schema.Array(Schema.NonEmptyString)
  .check(Schema.isMaxLength(MAX_TAGS))
  .annotate({ description: "カテゴリになるタグ" });

const Infobox = Schema.Array(InfoboxRow)
  .check(Schema.isMaxLength(MAX_INFOBOX))
  .annotate({ description: "右上の情報欄。ソフトウェアや組織などで要るときだけ付ける" });

const ArticleInput = Schema.Struct({
  slug: Slug,
  title: Title,
  description: Description,
  body: Body,
  tags: Schema.optionalKey(Tags),
  infobox: Schema.optionalKey(Infobox),
});

export { ArticleInput };
