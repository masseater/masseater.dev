import { Option } from "effect";
import { expect, test } from "vite-plus/test";

import { configOf, withOtelEnv } from "./config.ts";

test("an endpoint turns the spans on", () => {
  expect(configOf(Option.some("http://127.0.0.1:4318"))).toMatchObject({
    test: { experimental: { openTelemetry: { enabled: true } } },
  });
});

test("no endpoint leaves the config alone", () => {
  expect(configOf(Option.none())).toStrictEqual({});
});

test("withOtelEnv keeps the task and passes the OpenTelemetry variables without fingerprinting them", () => {
  expect(withOtelEnv({ command: "vp test run", cache: { input: ["src/**"] } })).toStrictEqual({
    command: "vp test run",
    cache: { input: ["src/**"], untrackedEnv: ["OTEL_*"] },
  });
});
