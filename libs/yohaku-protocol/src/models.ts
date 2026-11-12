import { Schema } from "effect";

const ManuscriptId = Schema.String;

const ParagraphId = Schema.String;

const SourceId = Schema.String;

const ParagraphKind = Schema.Literals(["prose", "memo", "idea"]).annotate({
  identifier: "ParagraphKind",
});

const TitleAuthor = Schema.Literals(["writer", "ai"]).annotate({ identifier: "TitleAuthor" });

const Title = Schema.Struct({ text: Schema.String, by: TitleAuthor }).annotate({
  identifier: "Title",
});

const Manuscript = Schema.Struct({
  id: ManuscriptId,
  title: Schema.NullOr(Title),
  excerpt: Schema.String,
  updatedAt: Schema.Int,
}).annotate({ identifier: "Manuscript" });

const Paragraph = Schema.Struct({ id: ParagraphId, text: Schema.String }).annotate({
  identifier: "Paragraph",
});

const Classified = Schema.Struct({ paragraphId: ParagraphId, kind: ParagraphKind }).annotate({
  identifier: "Classified",
});

const Remark = Schema.Struct({
  paragraphId: ParagraphId,
  from: Schema.Int,
  to: Schema.Int,
  rule: Schema.String,
  message: Schema.String,
}).annotate({ identifier: "Remark" });

const Annotations = Schema.Struct({
  title: Schema.NullOr(Title),
  kinds: Schema.Array(Classified),
  remarks: Schema.Array(Remark),
}).annotate({ identifier: "Annotations" });

const FactKind = Schema.Literals([
  "character",
  "voice",
  "event",
  "knowledge",
  "setting",
  "idea",
]).annotate({ identifier: "FactKind" });

const Fact = Schema.Struct({
  kind: FactKind,
  subject: Schema.String,
  body: Schema.String,
  when: Schema.NullOr(Schema.String),
}).annotate({ identifier: "Fact" });

const SourceOrigin = Schema.Literals(["manuscript", "mcp", "agent"]).annotate({
  identifier: "SourceOrigin",
});

const Reaction = Schema.Literals([
  "draft-accepted",
  "draft-rewritten",
  "draft-kept",
  "remark-dismissed",
  "remark-rewritten",
  "question-deferred",
]).annotate({ identifier: "Reaction" });

const Source = Schema.Struct({
  id: SourceId,
  label: Schema.String,
  origin: SourceOrigin,
  client: Schema.String,
  facts: Schema.Int,
  createdAt: Schema.Int,
}).annotate({ identifier: "Source" });

export {
  Annotations,
  Classified,
  Fact,
  FactKind,
  Manuscript,
  ManuscriptId,
  Paragraph,
  ParagraphId,
  ParagraphKind,
  Reaction,
  Remark,
  Source,
  SourceId,
  SourceOrigin,
  Title,
  TitleAuthor,
};
