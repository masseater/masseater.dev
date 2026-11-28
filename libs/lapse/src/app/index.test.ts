import { Option } from "effect";
import { expect, test } from "vite-plus/test";

import { configOf } from "./config.ts";

test("an endpoint turns the spans on", () => {
  expect(configOf(Option.some("http://127.0.0.1:4318"))).toMatchObject({
    test: { experimental: { openTelemetry: { enabled: true } } },
  });
});

test("no endpoint leaves the config alone", () => {
  expect(configOf(Option.none())).toStrictEqual({});
});
