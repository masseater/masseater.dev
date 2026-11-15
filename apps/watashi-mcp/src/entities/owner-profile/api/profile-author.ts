import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { Context } from "effect";
import type { Effect } from "effect";

export class ProfileAuthor extends Context.Service<
  ProfileAuthor,
  { readonly write: (input: string) => Effect.Effect<string, UpstreamFailed> }
>()("watashi-mcp/entities/owner-profile/api/profile-author/ProfileAuthor") {}
