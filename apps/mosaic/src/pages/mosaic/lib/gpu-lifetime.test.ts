import { Option } from "effect";
import { expect, test, vi } from "vite-plus/test";

import { onCached, onRestored, releaseOnUnmount, whileMounted } from "./gpu-lifetime";

const pageTransition = (type: string, persisted: boolean): Event =>
  Object.defineProperty(new Event(type), "persisted", { value: persisted });

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

test("releases the device when the page is kept in the back-forward cache", () => {
  const page = new EventTarget();
  const controller = new AbortController();
  const destroy = vi.fn<() => undefined>();
  releaseOnUnmount(controller.signal)({ device: { destroy }, context: { unconfigure: vi.fn() } });
  onCached(page)(() => {
    controller.abort();
  });
  page.dispatchEvent(pageTransition("pagehide", false));
  const beforeCaching = destroy.mock.calls.length;
  page.dispatchEvent(pageTransition("pagehide", true));
  expect({ beforeCaching, after: destroy.mock.calls.length }).toStrictEqual({
    beforeCaching: 0,
    after: 1,
  });
});

test("asks for a new viewer only when the page comes back from the back-forward cache", () => {
  const page = new EventTarget();
  const restored = vi.fn<() => undefined>();
  const stop = onRestored(page)(restored);
  page.dispatchEvent(pageTransition("pageshow", false));
  page.dispatchEvent(pageTransition("pageshow", true));
  stop();
  page.dispatchEvent(pageTransition("pageshow", true));
  expect(restored).toHaveBeenCalledOnce();
});
