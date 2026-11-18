import type { CallToolResult } from "@modelcontextprotocol/server";
import { Effect, Schema } from "effect";

const PNG = "image/png";

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

export const text = (value: string): CallToolResult => ({
  content: [{ type: "text", text: value }],
});

export const failure = (value: string): CallToolResult => ({ ...text(value), isError: true });

export const json = (value: unknown): Effect.Effect<CallToolResult> =>
  encodeJson(value).pipe(Effect.map(text), Effect.orDie);

export const png = (bytes: Uint8Array): CallToolResult => ({
  content: [
    { type: "image", data: globalThis.Buffer.from(bytes).toString("base64"), mimeType: PNG },
  ],
});
