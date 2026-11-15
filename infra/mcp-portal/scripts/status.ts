import { CredentialsFromEnv } from "@distilled.cloud/cloudflare/Credentials";
import {
  listAccessAiControlMcpPortals,
  listAccessAiControlMcpServers,
  listAccessApplicationsForAccount,
  syncAccessAiControlMcpServer,
} from "@distilled.cloud/cloudflare/zero-trust";
import { runMain } from "@masseater.dev/node-main";
import { Config, Console, Effect, Layer, Schema, Stream } from "effect";

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const print = (label: string, value: unknown): Effect.Effect<void, Schema.SchemaError> =>
  encodeJson(value).pipe(Effect.flatMap((json) => Console.log(`${label} ${json}`)));

const syncServer = Effect.fn("syncServer")(
  function* syncServer(accountId: string, id: string) {
    const result = yield* syncAccessAiControlMcpServer({ accountId, id });
    yield* print(id, result);
  },
  (effect, _accountId, id) =>
    effect.pipe(
      Effect.tapError((failure) => Console.log(id, failure)),
      Effect.ignore,
    ),
);

const status = Effect.gen(function* status() {
  const accountId = yield* Config.String("CLOUDFLARE_ACCOUNT_ID");
  const servers = yield* Stream.runCollect(listAccessAiControlMcpServers.items({ accountId }));
  yield* Effect.forEach(servers, ({ id }) => syncServer(accountId, id), { discard: true });
  const portals = yield* Stream.runCollect(listAccessAiControlMcpPortals.items({ accountId }));
  yield* Effect.forEach(
    portals,
    ({ id, hostname, codeMode, allowCodeMode, servers: portalServers }) =>
      print("portal", { id, hostname, codeMode, allowCodeMode, servers: portalServers }),
    { discard: true },
  );
  const applications = yield* Stream.runCollect(
    listAccessApplicationsForAccount.items({ accountId }),
  );
  yield* Effect.forEach(applications, (application) => print("application", application), {
    discard: true,
  });
});

runMain("mcp-portal-status")(
  Layer.build(CredentialsFromEnv).pipe(
    Effect.flatMap((context) => Effect.provideContext(status, context)),
    Effect.scoped,
  ),
);
