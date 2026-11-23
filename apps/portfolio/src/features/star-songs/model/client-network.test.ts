import { expect, test } from "vite-plus/test";

import { clientNetwork } from "./client-network.ts";

test("IPv4 はそのまま返す", () => {
  expect(clientNetwork("192.0.2.1")).toBe("192.0.2.1");
});

test("IPv6 は /64 の接頭辞にまとめる", () => {
  expect(clientNetwork("2001:db8:12:34::1")).toBe("2001:db8:12:34");
  expect(clientNetwork("2001:db8:12:34:aaaa:bbbb:cccc:dddd")).toBe("2001:db8:12:34");
});

test("省略された 0 を補ってから接頭辞を取る", () => {
  expect(clientNetwork("2001:db8::1")).toBe("2001:db8:0:0");
  expect(clientNetwork("::1")).toBe("0:0:0:0");
  expect(clientNetwork("2001:db8:1::")).toBe("2001:db8:1:0");
});

test("大文字と先頭の 0 が違っても同じ接頭辞にする", () => {
  expect(clientNetwork("2001:0DB8:0012:0034::1")).toBe("2001:db8:12:34");
});

test("アドレスが無ければ空のまま返す", () => {
  expect(clientNetwork("")).toBe("");
});
