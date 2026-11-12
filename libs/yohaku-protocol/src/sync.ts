import { Schema } from "effect";

import { Fact, Paragraph, SourceOrigin, Title } from "./models.ts";

const SYNC_HOST = "yohaku.masseater.dev";
const SYNC_ORIGIN = `https://${SYNC_HOST}`;
const CHANGES_PATH = "/api/changes";
const DOCUMENTS_PATH = "/api/documents";

const DocumentKind = Schema.Literals(["manuscript", "source"]);

const SyncDocument = Schema.Struct({
  kind: DocumentKind,
  id: Schema.String,
  updatedAt: Schema.Int,
  deleted: Schema.Boolean,
  body: Schema.String,
});

const StoredDocument = Schema.Struct({ ...SyncDocument.fields, revision: Schema.Int });

const Changes = Schema.Struct({ documents: Schema.Array(StoredDocument), more: Schema.Boolean });

const Pushed = Schema.Struct({ documents: Schema.Array(SyncDocument) });

const SyncStatus = Schema.Struct({
  connected: Schema.Boolean,
  syncedAt: Schema.NullOr(Schema.Int),
  pending: Schema.Int,
  problem: Schema.NullOr(Schema.String),
}).annotate({ identifier: "SyncStatus" });

const ManuscriptBody = Schema.Struct({
  title: Schema.NullOr(Title),
  createdAt: Schema.Int,
  paragraphs: Schema.Array(Paragraph),
});

const SourceBody = Schema.Struct({
  manuscriptId: Schema.NullOr(Schema.String),
  label: Schema.String,
  origin: SourceOrigin,
  client: Schema.String,
  createdAt: Schema.Int,
  facts: Schema.Array(Fact),
});

export {
  CHANGES_PATH,
  Changes,
  DOCUMENTS_PATH,
  DocumentKind,
  ManuscriptBody,
  Pushed,
  SYNC_HOST,
  SYNC_ORIGIN,
  SourceBody,
  StoredDocument,
  SyncDocument,
  SyncStatus,
};
