import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { Context } from "effect";
import type { Effect } from "effect";

export type ProfileRequest = Readonly<{
  step: string;
  instructions: string;
  format: object;
  input: string;
}>;

export class ProfileAuthor extends Context.Service<
  ProfileAuthor,
  { readonly write: (request: ProfileRequest) => Effect.Effect<string, UpstreamFailed> }
>()("watashi-mcp/entities/owner-profile/api/profile-author/ProfileAuthor") {}
