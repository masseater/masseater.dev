import { Option } from "effect";

import { useHint } from "#/entities/onboarding";

const findRevert = (): Option.Option<Element> =>
  Option.fromNullishOr(document.querySelector("[data-revert]"));

const useSourceHint = (): void => {
  useHint({
    step: "source-hint",
    find: findRevert,
    title: "戻す",
    description: "この資料から入った設定をまとめて消す",
  });
};

export { useSourceHint };
