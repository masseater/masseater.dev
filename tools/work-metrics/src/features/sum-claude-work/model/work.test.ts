import { expect, test } from "vite-plus/test";

import { workOf } from "./work.ts";

const OUTPUT_TOKENS = 30;
const REQUEST_MILLIS = 2000;
const BASH_MILLIS = 500;

test("sums the requests and the tool calls of one session", () => {
  const work = workOf("cse_a")([
    {
      body: "claude_code.api_request",
      attributes: { output_tokens: OUTPUT_TOKENS, duration_ms: REQUEST_MILLIS, cost_usd: "0.5" },
    },
    { body: "claude_code.api_error", attributes: {} },
    {
      body: "claude_code.tool_result",
      attributes: { tool_name: "Bash", success: "false", duration_ms: BASH_MILLIS },
    },
    {
      body: "claude_code.tool_result",
      attributes: { tool_name: "Bash", success: "true", duration_ms: BASH_MILLIS },
    },
  ]);
  expect(work).toMatchObject({
    session: "cse_a",
    requests: 1,
    apiErrors: 1,
    outputTokens: OUTPUT_TOKENS,
    costUsd: 0.5,
    apiSeconds: 2,
    tools: [{ tool: "Bash", calls: 2, failures: 1, seconds: 1 }],
  });
});
