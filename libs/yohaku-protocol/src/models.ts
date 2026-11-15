import { Schema } from "effect";

export const ManuscriptId = Schema.String;

export const ParagraphId = Schema.String;

export const SourceId = Schema.String;

export const ParagraphKind = Schema.Literals(["prose", "memo", "idea"]).annotate({
  identifier: "ParagraphKind",
});

const TitleAuthor = Schema.Literals(["writer", "ai"]).annotate({ identifier: "TitleAuthor" });

export const Title = Schema.Struct({ text: Schema.String, by: TitleAuthor }).annotate({
  identifier: "Title",
});

export const Manuscript = Schema.Struct({
  id: ManuscriptId,
  title: Schema.NullOr(Title),
  excerpt: Schema.String,
  updatedAt: Schema.Int,
}).annotate({ identifier: "Manuscript" });

export const Paragraph = Schema.Struct({ id: ParagraphId, text: Schema.String }).annotate({
  identifier: "Paragraph",
});

export const Classified = Schema.Struct({ paragraphId: ParagraphId, kind: ParagraphKind }).annotate(
  {
    identifier: "Classified",
  },
);

export const Remark = Schema.Struct({
  paragraphId: ParagraphId,
  from: Schema.Int,
  to: Schema.Int,
  rule: Schema.String,
  message: Schema.String,
}).annotate({ identifier: "Remark" });

export const Annotations = Schema.Struct({
  title: Schema.NullOr(Title),
  kinds: Schema.Array(Classified),
  remarks: Schema.Array(Remark),
}).annotate({ identifier: "Annotations" });

export const FactKind = Schema.Literals([
  "character",
  "voice",
  "event",
  "knowledge",
  "setting",
  "idea",
]).annotate({ identifier: "FactKind" });

export const Fact = Schema.Struct({
  kind: FactKind,
  subject: Schema.String,
  body: Schema.String,
  when: Schema.NullOr(Schema.String),
}).annotate({ identifier: "Fact" });

export const SourceOrigin = Schema.Literals(["manuscript", "mcp", "agent"]).annotate({
  identifier: "SourceOrigin",
});

export const Reaction = Schema.Literals([
  "draft-accepted",
  "draft-rewritten",
  "draft-kept",
  "remark-dismissed",
  "remark-rewritten",
  "question-deferred",
]).annotate({ identifier: "Reaction" });

export const Source = Schema.Struct({
  id: SourceId,
  label: Schema.String,
  origin: SourceOrigin,
  client: Schema.String,
  facts: Schema.Int,
  createdAt: Schema.Int,
}).annotate({ identifier: "Source" });
