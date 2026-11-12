import { Context } from "effect";

class EndpointDirectory extends Context.Service<EndpointDirectory, string>()(
  "@masseater.dev/local-server/endpoint-directory/EndpointDirectory",
) {}

export { EndpointDirectory };
