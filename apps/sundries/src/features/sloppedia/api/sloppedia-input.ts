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
const MARKDOWN_LINK = /\[[^\]]*\]\(/u;
const NUMERIC_FOOTNOTE = /\[\^\d+\]/u;
const TOP_HEADING = /^#\s/mu;
const BOLD_LEAD = /^\s*\*\*/u;
const WEB_URL = /^https?:\/\//u;

const requires = (matches: (text: string) => boolean, message: string): SchemaAST.Filter<string> =>
  Schema.makeFilter<string>((text) => matches(text) || message);

const rejects = (matches: (text: string) => boolean, message: string): SchemaAST.Filter<string> =>
  Schema.makeFilter<string>((text) => !matches(text) || message);

const Slug = Schema.String.check(Schema.isPattern(SLUG)).annotate({
  description: "The subject's English name in kebab-case, such as web-dev",
});

const Title = Schema.NonEmptyString.check(Schema.isMaxLength(MAX_TITLE)).annotate({
  description: "The subject's official name",
});

const Description = Schema.NonEmptyString.check(
  Schema.isMaxLength(MAX_DESCRIPTION),
  requires((text) => SENTENCE_END.test(text), "文末は「。」で終える"),
  rejects((text) => BARE_URL.test(text), "リンクや記号を入れない"),
  rejects((text) => MDX_SYNTAX.test(text), "リンクや記号を入れない"),
  rejects((text) => MARKDOWN_LINK.test(text), "リンクや記号を入れない"),
).annotate({ description: "One plain sentence for the index and OGP" });

const Body = Schema.NonEmptyString.check(
  rejects((text) => TOP_HEADING.test(text), "見出しは##から使う。#は記事名が使う"),
  rejects((text) => BOLD_LEAD.test(text), "冒頭の題名を太字にしない"),
  rejects((text) => BARE_URL.test(text), "URLは[語](URL)の形で埋め込む"),
  rejects((text) => MDX_SYNTAX.test(text), "{ } < はMDXとして解釈されるので使えない"),
  rejects((text) => NUMERIC_FOOTNOTE.test(text), "脚注のラベルは番号でなく名前にする"),
).annotate({ description: "Markdown without frontmatter or the title heading" });

const Href = Schema.String.check(Schema.isPattern(WEB_URL));

const InfoboxRow = Schema.Struct({
  label: Schema.NonEmptyString.annotate({ description: "Such as 開発元" }),
  value: Schema.NonEmptyString,
  href: Schema.optionalKey(Href),
});

const Tags = Schema.Array(Schema.NonEmptyString).check(Schema.isMaxLength(MAX_TAGS));

const Infobox = Schema.Array(InfoboxRow)
  .check(Schema.isMaxLength(MAX_INFOBOX))
  .annotate({ description: "Side facts box, for software, organizations and the like" });

export const ArticleInput = Schema.Struct({
  slug: Slug,
  title: Title,
  description: Description,
  body: Body,
  tags: Schema.optionalKey(Tags),
  infobox: Schema.optionalKey(Infobox),
});
