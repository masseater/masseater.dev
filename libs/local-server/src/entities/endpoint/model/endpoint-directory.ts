import { Context } from "effect";

export class EndpointDirectory extends Context.Service<EndpointDirectory, string>()(
  "@masseater.dev/local-server/entities/endpoint/model/endpoint-directory/EndpointDirectory",
) {}
