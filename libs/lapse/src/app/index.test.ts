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

test("withOtelEnv keeps the test task and passes the OpenTelemetry variables without fingerprinting them", () => {
  const config = {
    name: "root",
    run: {
      remoteCache: "x",
      tasks: { test: { command: "vp test run", cache: { input: ["src/**"] } }, build: "vp build" },
    },
  };
  expect(withOtelEnv(config)).toStrictEqual({
    name: "root",
    run: {
      remoteCache: "x",
      tasks: {
        test: { command: "vp test run", cache: { input: ["src/**"], untrackedEnv: ["OTEL_*"] } },
        build: "vp build",
      },
    },
  });
});
