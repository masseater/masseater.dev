import { Query } from "@effect/ui";
import { Effect, Schema } from "effect";

import { fetchClientName } from "#/features/answer-consent/model/consent.ts";

export class ClientName extends Query.Service<ClientName>()("answer-consent/ClientName", {
  args: { clientId: Schema.String },
  success: Schema.String,
  staleTime: "30 seconds",
}) {
  public static readonly layer = this.toLayer(
    Effect.succeed(({ clientId }) => Effect.promise(() => fetchClientName(clientId))),
  );
}
