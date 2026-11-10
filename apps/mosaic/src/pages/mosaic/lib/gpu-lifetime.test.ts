import { Option } from "effect";
import { expect, test, vi } from "vite-plus/test";

import { releaseOnUnmount, whileMounted } from "./gpu-lifetime";

test("destroys the device and unconfigures the canvas when the viewer is unmounted", () => {
  const controller = new AbortController();
  const destroy = vi.fn<() => undefined>();
  const unconfigure = vi.fn<() => undefined>();
  releaseOnUnmount(controller.signal)({ device: { destroy }, context: { unconfigure } });
  expect(destroy).not.toHaveBeenCalled();
  controller.abort();
  expect(unconfigure).toHaveBeenCalledOnce();
  expect(destroy).toHaveBeenCalledOnce();
});

test("destroys a device that arrives after the viewer is unmounted and hands out nothing", () => {
  const controller = new AbortController();
  const destroy = vi.fn<() => undefined>();
  controller.abort();
  expect(Option.isNone(whileMounted(controller.signal)({ destroy }))).toBe(true);
  expect(destroy).toHaveBeenCalledOnce();
});

test("hands out the device untouched while the viewer is mounted", () => {
  const controller = new AbortController();
  const destroy = vi.fn<() => undefined>();
  expect(Option.isSome(whileMounted(controller.signal)({ destroy }))).toBe(true);
  expect(destroy).not.toHaveBeenCalled();
});
