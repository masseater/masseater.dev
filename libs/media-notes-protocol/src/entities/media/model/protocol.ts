import { Schema } from "effect";

export const SiteSchema = Schema.Literals(["youtube", "niconico", "soundcloud", "file"]).annotate({
  identifier: "Site",
});

export const SourceSchema = Schema.Struct({ site: SiteSchema, id: Schema.NonEmptyString }).annotate(
  { identifier: "Source" },
);

export const MediaSchema = Schema.Struct({
  source: SourceSchema,
  title: Schema.String,
  artist: Schema.String,
}).annotate({ identifier: "Media" });

export const OpenedSchema = Schema.Struct({
  media: MediaSchema,
  location: Schema.String,
}).annotate({ identifier: "Opened" });

export const SavedSchema = Schema.Struct({ id: Schema.String, at: Schema.Int }).annotate({
  identifier: "Saved",
});

export const McpAccessSchema = Schema.Struct({ url: Schema.String, token: Schema.String }).annotate(
  { identifier: "McpAccess" },
);

export type Site = typeof SiteSchema.Type;

export type Source = typeof SourceSchema.Type;

export type Media = typeof MediaSchema.Type;

export type Opened = typeof OpenedSchema.Type;

export type Saved = typeof SavedSchema.Type;

export type McpAccess = typeof McpAccessSchema.Type;
