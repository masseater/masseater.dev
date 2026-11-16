import { Option } from "effect";

import { useHint } from "#/entities/onboarding/index.ts";

const findRevert = (): Option.Option<Element> =>
  Option.fromNullishOr(document.querySelector("[data-revert]"));

export const useSourceHint = (): void => {
  useHint({
    step: "source-hint",
    find: findRevert,
    title: "戻す",
    description: "この資料から入った設定をまとめて消す",
  });
};
