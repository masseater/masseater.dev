import { Effect, Schema } from "effect";
import { expect, test } from "vite-plus/test";

import { logsInFile, spansInFile } from "./collector-files.ts";

const TRACE_ID = "5b8efff798038103d269b633813fc60c";
const SPAN_ID = "eee19b7ec3c1b174";
const TOOL_MILLIS = 42;

const spanExport = {
  resourceSpans: [
    {
      resource: { attributes: [{ key: "service.name", value: { stringValue: "msch" } }] },
      scopeSpans: [
        {
          scope: { name: "y8" },
          spans: [
            {
              traceId: TRACE_ID,
              spanId: SPAN_ID,
              name: "y8.rule",
              kind: 1,
              status: { code: 2 },
              startTimeUnixNano: "1000",
              endTimeUnixNano: "3000",
              attributes: [{ key: "y8.rule.id", value: { stringValue: "heading" } }],
            },
          ],
        },
      ],
    },
  ],
};

const logExport = {
  resourceLogs: [
    {
      resource: { attributes: [] },
      scopeLogs: [
        {
          scope: { name: "com.anthropic.claude_code.events" },
          logRecords: [
            {
              timeUnixNano: "2000",
              body: { stringValue: "claude_code.tool_result" },
              attributes: [
                { key: "tool_name", value: { stringValue: "Bash" } },
                { key: "duration_ms", value: { intValue: String(TOOL_MILLIS) } },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

test("reads every export in a file that the file exporter of a collector wrote", () =>
  Effect.gen(function* readsCollectorFiles() {
    const spanLine = yield* encodeJson(spanExport);
    const logLine = yield* encodeJson(logExport);
    const spans = yield* spansInFile(`${spanLine}\n${spanLine}\n\n`);
    expect(spans).toMatchObject([
      {
        traceId: TRACE_ID,
        spanId: SPAN_ID,
        name: "y8.rule",
        kind: "SPAN_KIND_INTERNAL",
        status: { code: "STATUS_CODE_ERROR" },
        attributes: { "y8.rule.id": "heading" },
        resource: { "service.name": "msch" },
      },
      { name: "y8.rule" },
    ]);
    const logs = yield* logsInFile(`${logLine}\n`);
    expect(logs).toMatchObject([
      {
        body: "claude_code.tool_result",
        attributes: { tool_name: "Bash", duration_ms: TOOL_MILLIS },
      },
    ]);
  }).pipe(Effect.runPromise));
