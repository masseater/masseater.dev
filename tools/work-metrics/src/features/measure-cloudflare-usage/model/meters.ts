export type Meter = Readonly<{
  name: string;
  dataset: string;
  metric: string;
  dimension: string;
  divisor: number;
}>;

const ONE = 1;
const MICROSECONDS_PER_MILLISECOND = 1000;

export const METERS: readonly Meter[] = [
  {
    name: "workers.requests",
    dataset: "workersInvocationsAdaptive",
    metric: "requests",
    dimension: "scriptName",
    divisor: ONE,
  },
  {
    name: "workers.cpuMs",
    dataset: "workersInvocationsAdaptive",
    metric: "cpuTimeUs",
    dimension: "scriptName",
    divisor: MICROSECONDS_PER_MILLISECOND,
  },
  {
    name: "durableObjects.requests",
    dataset: "durableObjectsInvocationsAdaptiveGroups",
    metric: "requests",
    dimension: "scriptName",
    divisor: ONE,
  },
  {
    name: "d1.rowsRead",
    dataset: "d1AnalyticsAdaptiveGroups",
    metric: "rowsRead",
    dimension: "databaseId",
    divisor: ONE,
  },
  {
    name: "d1.rowsWritten",
    dataset: "d1AnalyticsAdaptiveGroups",
    metric: "rowsWritten",
    dimension: "databaseId",
    divisor: ONE,
  },
  {
    name: "r2.operations",
    dataset: "r2OperationsAdaptiveGroups",
    metric: "requests",
    dimension: "bucketName",
    divisor: ONE,
  },
  {
    name: "kv.operations",
    dataset: "kvOperationsAdaptiveGroups",
    metric: "requests",
    dimension: "namespaceId",
    divisor: ONE,
  },
  {
    name: "queues.operations",
    dataset: "queueMessageOperationsAdaptiveGroups",
    metric: "billableOperations",
    dimension: "queueId",
    divisor: ONE,
  },
  {
    name: "workersAi.neurons",
    dataset: "aiInferenceAdaptiveGroups",
    metric: "totalNeurons",
    dimension: "modelId",
    divisor: ONE,
  },
];
