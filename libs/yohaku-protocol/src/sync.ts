import { Schema } from "effect";

import { Count, Fact, Paragraph, SourceOrigin, Title } from "./models.ts";

export const SYNC_HOST = "yohaku.masseater.dev";
export const SYNC_ORIGIN = `https://${SYNC_HOST}`;
export const CHANGES_PATH = "/api/changes";
export const DOCUMENTS_PATH = "/api/documents";

export const DocumentKind = Schema.Literals(["manuscript", "source"]).annotate({
  identifier: "DocumentKind",
});

export const SyncDocument = Schema.Struct({
  kind: DocumentKind,
  id: Schema.String,
  updatedAt: Schema.Int,
  deleted: Schema.Boolean,
  body: Schema.String,
}).annotate({ identifier: "SyncDocument" });

export const StoredDocument = Schema.Struct({
  ...SyncDocument.fields,
  revision: Schema.Int,
}).annotate({ identifier: "StoredDocument" });

export const Changes = Schema.Struct({
  documents: Schema.Array(StoredDocument),
  more: Schema.Boolean,
}).annotate({ identifier: "Changes" });

export const Pushed = Schema.Struct({ documents: Schema.Array(SyncDocument) }).annotate({
  identifier: "Pushed",
});

export const SyncStatus = Schema.Struct({
  connected: Schema.Boolean,
  syncedAt: Schema.NullOr(Schema.Int),
  pending: Count,
  problem: Schema.NullOr(Schema.String),
}).annotate({ identifier: "SyncStatus" });

export const ManuscriptBody = Schema.Struct({
  title: Schema.NullOr(Title),
  createdAt: Schema.Int,
  paragraphs: Schema.Array(Paragraph),
}).annotate({ identifier: "ManuscriptBody" });

export const SourceBody = Schema.Struct({
  manuscriptId: Schema.NullOr(Schema.String),
  label: Schema.String,
  origin: SourceOrigin,
  client: Schema.String,
  createdAt: Schema.Int,
  facts: Schema.Array(Fact),
}).annotate({ identifier: "SourceBody" });
