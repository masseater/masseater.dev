import { RequestFailed } from "@masseater.dev/local-server";
import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/rpc";

import {
  Annotations,
  Manuscript,
  ManuscriptId,
  Paragraph,
  ParagraphId,
  Reaction,
  Source,
  SourceId,
} from "./models.ts";
import { SyncStatus } from "./sync.ts";

const Manuscripts = Schema.Struct({ manuscripts: Schema.Array(Manuscript) });

const Opened = Schema.Struct({ manuscript: Manuscript, paragraphs: Schema.Array(Paragraph) });

const Sources = Schema.Struct({ sources: Schema.Array(Source) });

const Mcp = Schema.Struct({ url: Schema.String, token: Schema.String });

const SignIn = Schema.Struct({ url: Schema.String });

const ParagraphTarget = { id: ManuscriptId, paragraphId: ParagraphId };

/** @internal */
export class YohakuRpcs extends RpcGroup.make(
  Rpc.make("ListManuscripts", { success: Manuscripts, error: RequestFailed }),
  Rpc.make("CreateManuscript", { success: Manuscript, error: RequestFailed }),
  Rpc.make("OpenManuscript", {
    payload: { id: ManuscriptId },
    success: Opened,
    error: RequestFailed,
  }),
  Rpc.make("SaveParagraphs", {
    payload: { id: ManuscriptId, paragraphs: Schema.Array(Paragraph) },
    error: RequestFailed,
  }),
  Rpc.make("SetTitle", {
    payload: { id: ManuscriptId, text: Schema.String },
    success: Manuscript,
    error: RequestFailed,
  }),
  Rpc.make("GetAnnotations", {
    payload: { id: ManuscriptId },
    success: Annotations,
    error: RequestFailed,
  }),
  Rpc.make("DraftFromMemo", {
    payload: ParagraphTarget,
    success: Schema.String,
    error: RequestFailed,
    stream: true,
  }),
  Rpc.make("RewriteRemark", {
    payload: { ...ParagraphTarget, from: Schema.Int, to: Schema.Int, rule: Schema.String },
    success: Schema.String,
    error: RequestFailed,
    stream: true,
  }),
  Rpc.make("DismissRemark", {
    payload: { ...ParagraphTarget, rule: Schema.String },
    error: RequestFailed,
  }),
  Rpc.make("LogReaction", { payload: { reaction: Reaction }, error: RequestFailed }),
  Rpc.make("ListSources", { success: Sources, error: RequestFailed }),
  Rpc.make("IngestText", {
    payload: { text: Schema.String },
    success: Source,
    error: RequestFailed,
  }),
  Rpc.make("RevertSource", { payload: { id: SourceId }, error: RequestFailed }),
  Rpc.make("GetMcp", { success: Mcp, error: RequestFailed }),
  Rpc.make("ReadSyncStatus", { success: SyncStatus, error: RequestFailed }),
  Rpc.make("BeginSyncSignIn", { success: SignIn, error: RequestFailed }),
) {}
