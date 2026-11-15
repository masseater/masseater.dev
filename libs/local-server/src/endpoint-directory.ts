import { Context } from "effect";

export class EndpointDirectory extends Context.Service<EndpointDirectory, string>()(
  "@masseater.dev/local-server/endpoint-directory/EndpointDirectory",
) {}
