import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { amountOf, preparationOf } from "./preparation.ts";

const idle = {
  progress: Option.none(),
  failure: Option.none(),
  isFetching: false,
  isSuccess: false,
};

const progress = { received: 123_456_789, total: 573_126_848 };

describe("preparationOf", () => {
  it("waits while the engine starts with the model already on the disk", () => {
    expect(preparationOf({ ...idle, isFetching: true })).toStrictEqual({ status: "preparing" });
  });

  it("shows how much of the model has arrived", () => {
    expect(
      preparationOf({ ...idle, isFetching: true, progress: Option.some(progress) }),
    ).toStrictEqual({ status: "downloading", progress });
  });

  it("is ready once the engine has started, whatever was downloaded before", () => {
    expect(
      preparationOf({ ...idle, isSuccess: true, progress: Option.some(progress) }),
    ).toStrictEqual({ status: "ready" });
  });

  it("shows why the engine did not get ready", () => {
    expect(
      preparationOf({ ...idle, failure: Option.some("モデルを取得できません") }),
    ).toStrictEqual({ status: "failed", message: "モデルを取得できません" });
  });

  it("hides the earlier failure while it tries again", () => {
    expect(
      preparationOf({ ...idle, isFetching: true, failure: Option.some("モデルを取得できません") }),
    ).toStrictEqual({ status: "preparing" });
  });
});

describe("amountOf", () => {
  it("counts in whole megabytes", () => {
    expect(amountOf(progress)).toBe("123 / 573 MB");
  });
});
