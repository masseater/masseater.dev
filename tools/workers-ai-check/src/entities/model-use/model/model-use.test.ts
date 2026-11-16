import { Option } from "effect";
import { expect, it } from "vite-plus/test";

import { findingsOf, modelsIn, searchTermOf } from "./model-use.ts";

const FLASH = "@cf/zai-org/glm-5.3-flash";

const INKLING = "@cf/thinkingmachines/inkling-2-small";

const GONE = "@cf/meta/llama-2-7b-chat-int8";

it("コードの文字列からモデル名を重ねずに集める", () => {
  const text = `model: "${FLASH}"\nfallback: ["cloudflare/${INKLING}", "${FLASH}"]`;
  expect(modelsIn(text)).toStrictEqual([INKLING, FLASH]);
});

it("検索にはモデル名の最後の区切りを使う", () => {
  expect(searchTermOf(INKLING)).toBe("inkling-2-small");
});

it("廃止の予定があるモデルと一覧に無いモデルだけを挙げる", () => {
  const catalog = [
    { name: FLASH, retiresOn: Option.some("2026-11-20") },
    { name: INKLING, retiresOn: Option.none() },
  ];
  expect(findingsOf({ models: [FLASH, INKLING, GONE], catalog })).toStrictEqual([
    { model: FLASH, problem: "retiring", on: "2026-11-20" },
    { model: GONE, problem: "missing", on: "" },
  ]);
});
