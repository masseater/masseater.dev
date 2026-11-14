import { Action } from "@masseater.dev/sts2-protocol";
import { Schema } from "effect";

const MAX_INSTANCES = 4;
const MIN_INSTANCES = 1;
const HOST_INSTANCE = 0;
const LAST_INSTANCE = MAX_INSTANCES - MIN_INSTANCES;
const MIN_LOG_LINES = 1;
const MAX_LOG_LINES = 2000;
const DEFAULT_LOG_LINES = 200;
const DEFAULT_REF = "main";

const InstanceRange = Schema.isBetween({ minimum: HOST_INSTANCE, maximum: LAST_INSTANCE });

const Instance = Schema.Int.check(InstanceRange).annotate({
  description: "0 はホスト (1 つだけ起動したときはその 1 つ)、1 以降は協力プレイの参加側",
});

const InstanceCount = Schema.Int.check(
  Schema.isBetween({ minimum: MIN_INSTANCES, maximum: MAX_INSTANCES }),
).annotate({ description: "起動するゲームの数。2 以上なら同じ VM で協力プレイにつなぐ" });

const LogLines = Schema.Int.check(
  Schema.isBetween({ minimum: MIN_LOG_LINES, maximum: MAX_LOG_LINES }),
).annotate({ description: "末尾から返す行数" });

const ModName = Schema.String.check(Schema.isPattern(/^[A-Za-z][A-Za-z0-9]*$/u));

const Mods = Schema.Array(ModName).annotate({
  description: "AgentBridge のほかに入れる apps/sts2-mods/mods の mod の名前",
});

const GitRef = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9._/-]+$/u)).annotate({
  description: "ゲストが origin から取得するブランチ名かコミット。既定は main",
});

const DeployInput = Schema.Struct({
  ref: Schema.optionalKey(GitRef),
  mods: Schema.optionalKey(Mods),
});

const LaunchInput = Schema.Struct({
  instances: Schema.optionalKey(InstanceCount),
  mods: Schema.optionalKey(Mods),
});

const InstanceInput = Schema.Struct({ instance: Schema.optionalKey(Instance) });

const ActInput = Schema.Struct({ instance: Schema.optionalKey(Instance), action: Action });

const LogsInput = Schema.Struct({
  instance: Schema.optionalKey(Instance),
  lines: Schema.optionalKey(LogLines),
});

const EmptyInput = Schema.Struct({});

const DEPLOY_SCHEMA = DeployInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const LAUNCH_SCHEMA = LaunchInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const INSTANCE_SCHEMA = InstanceInput.pipe(
  Schema.toStandardSchemaV1,
  Schema.toStandardJSONSchemaV1,
);

const ACT_SCHEMA = ActInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const LOGS_SCHEMA = LogsInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const EMPTY_SCHEMA = EmptyInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

type DeployRequest = typeof DeployInput.Type;

type LaunchRequest = typeof LaunchInput.Type;

type InstanceRequest = typeof InstanceInput.Type;

type ActRequest = typeof ActInput.Type;

type LogsRequest = typeof LogsInput.Type;

export {
  ACT_SCHEMA,
  DEFAULT_LOG_LINES,
  DEFAULT_REF,
  DEPLOY_SCHEMA,
  EMPTY_SCHEMA,
  HOST_INSTANCE,
  INSTANCE_SCHEMA,
  LAUNCH_SCHEMA,
  LOGS_SCHEMA,
  MIN_INSTANCES,
};
export type { ActRequest, DeployRequest, InstanceRequest, LaunchRequest, LogsRequest };
