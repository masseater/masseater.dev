import { Containers, D1, SecretsStore, Workers } from "@alchemy.run/cloudflare";
import { ownerAccess } from "@masseater.dev/cloudflare-account/owner-access";
import { tracedStackProps } from "@masseater.dev/cloudflare-account/traced-providers";
import { RemovalPolicy, Stack } from "alchemy";
import { Build } from "alchemy/Command";
import { Effect, FileSystem, Schema } from "effect";

import { APP_NAME, PREFIX, requireAppPrefix } from "./src/shared/config/app-name.ts";
import { HOST, INTERVIEWER_IMAGE } from "./src/shared/config/kikite.ts";

const PROD = "prod";

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
        include: [
          "src/app/server/**",
          "src/features/generate-interview/**",
          "src/entities/strategy/**",
          "src/shared/api/**",
          "src/shared/config/**",
          "*.ts",
          "package.json",
        ],
        exclude: ["**/*.test.ts", "alchemy.run.ts", "src/app/server/dev.ts"],
      },
    });
    return {
      schedulingPolicy: "durable_object" as const,
      context: outdir,
      build: { args: { AGENT_SDK_VERSION: version } },
    };
  }),
);

export default Stack(
  APP_NAME,
  tracedStackProps,
  Effect.gen(function* stack() {
    yield* ownerAccess({
      id: "KikiteAccess",
      name: `${PREFIX}access`,
      host: HOST,
      loopbackClients: false,
    });
    const CLAUDE_CODE_OAUTH_TOKEN = yield* SecretsStore.Secret.ref(
      "CiClaudeCodeOauthToken",
      broker,
    );
    const SESSIONS = yield* D1.Database("Sessions", { migrations: "./migrations" }).pipe(
      RemovalPolicy.protect(),
    );
    const client = yield* Build("ClientBuild", {
      command: "vp build",
      outdir: "dist/client",
      memo: false,
    });
    const { url } = yield* Workers.Worker("Kikite", {
      main: "./src/app/worker/kikite.worker.ts",
      logpush: true,
      domain: HOST,
      workersDev: false,
      env: {
        INTERVIEWER: Workers.DurableObject("Interviewer", { containers: [InterviewerImage] }),
        CLAUDE_CODE_OAUTH_TOKEN,
        SESSIONS,
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
