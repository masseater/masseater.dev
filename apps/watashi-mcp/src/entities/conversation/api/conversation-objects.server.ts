import { Context } from "effect";

export type StoredObject = Readonly<{ body: ReadableStream<Uint8Array<ArrayBuffer>> }>;

export type PutOptions = Readonly<{ httpMetadata: Readonly<{ contentType: string }> }>;

export type ObjectStore = Readonly<{
  get: (key: string) => Promise<StoredObject | null>;
  put: (key: string, body: Uint8Array, options: PutOptions) => Promise<unknown>;
  delete: (key: string) => Promise<void>;
}>;

export class ConversationObjects extends Context.Service<ConversationObjects, ObjectStore>()(
  "watashi-mcp/entities/conversation/api/conversation-objects.server/ConversationObjects",
) {}
