import { Access, Containers, SecretsStore, Workers } from "@alchemy.run/cloudflare";
import { tracedStackProps } from "@masseater.dev/cloudflare-account/traced-providers";
import { Stack } from "alchemy";
import { Build } from "alchemy/Command";
import { Effect, FileSystem, Schema } from "effect";

import { APP_NAME, PREFIX, requireAppPrefix } from "./app-name.ts";
import { HOST, INTERVIEWER_IMAGE } from "./kikite.ts";

const { Application: defineApplication } = Access;

const PROD = "prod";
const SESSION_DURATION = "720h";
const ACCESS_TOKEN_LIFETIME = "15m";
const BROKER_CALLBACK = "https://credentials.masseater.dev/access-oauth/callback";

const personalSpace = { stack: "mydecklist", stage: PROD };
const broker = { stack: "masseater-dev-credential-broker", stage: PROD };

const SdkPackage = Schema.fromJsonString(Schema.Struct({ version: Schema.String }));

const agentSdkVersion = Effect.gen(function* agentSdkVersion() {
  const fs = yield* FileSystem.FileSystem;
  const json = yield* fs.readFileString(
    new URL("package.json", import.meta.resolve("@anthropic-ai/claude-agent-sdk")).pathname,
  );
  const { version } = yield* Schema.decodeEffect(SdkPackage)(json);
  return version;
}).pipe(Effect.orDie);

const InterviewerImage = Containers.Container(
  INTERVIEWER_IMAGE,
  Effect.gen(function* interviewerImage() {
    const version = yield* agentSdkVersion;
    const { outdir } = yield* Build("InterviewerBundle", {
      command: "vp pack",
      outdir: "dist/server",
      memo: {
        include: ["server/**", "*.ts", "package.json"],
        exclude: ["**/*.test.ts", "alchemy.run.ts", "server/dev.ts"],
      },
    });
    return {
      schedulingPolicy: "durable_object" as const,
      context: outdir,
      build: { args: { AGENT_SDK_VERSION: version } },
    };
  }),
);

const ownerOnly = Effect.gen(function* ownerOnly() {
  const owner = yield* Access.Policy.ref("OwnerPolicy", personalSpace);
  const google = yield* Access.IdentityProvider.ref("Google", personalSpace);
  yield* defineApplication("KikiteAccess", {
    name: `${PREFIX}access`,
    type: "self_hosted",
    domain: HOST,
    destinations: [{ type: "public", uri: HOST }],
    sessionDuration: SESSION_DURATION,
    allowedIdps: [google.identityProviderId],
    autoRedirectToIdentity: true,
    policies: [owner],
    oauthConfiguration: {
      enabled: true,
      grant: { sessionDuration: SESSION_DURATION, accessTokenLifetime: ACCESS_TOKEN_LIFETIME },
      dynamicClientRegistration: {
        enabled: true,
        allowedUris: [BROKER_CALLBACK],
        allowAnyOnLocalhost: false,
        allowAnyOnLoopback: false,
      },
    },
  });
});

export default Stack(
  APP_NAME,
  tracedStackProps,
  Effect.gen(function* stack() {
    yield* ownerOnly;
    const CLAUDE_CODE_OAUTH_TOKEN = yield* SecretsStore.Secret.ref(
      "CiClaudeCodeOauthToken",
      broker,
    );
    const client = yield* Build("ClientBuild", {
      command: "vp build",
      outdir: "dist/client",
      memo: false,
    });
    const { url } = yield* Workers.Worker("Kikite", {
      main: "./worker/kikite.worker.ts",
      logpush: true,
      domain: HOST,
      workersDev: false,
      env: {
        INTERVIEWER: Workers.DurableObject("Interviewer", { containers: [InterviewerImage] }),
        CLAUDE_CODE_OAUTH_TOKEN,
      },
      assets: {
        directory: client.outdir,
        notFoundHandling: "single-page-application",
        runWorkerFirst: ["/api/*"],
      },
    });
    yield* requireAppPrefix;
    return { url };
  }),
);
