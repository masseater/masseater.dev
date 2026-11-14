import { Option } from "effect";

import { useHint } from "#/entities/onboarding";

const findIdea = (): Option.Option<Element> =>
  Option.fromNullishOr(document.querySelector('.yohaku-kinds [data-kind="idea"]'));

const useIdeaHint = (): void => {
  useHint({
    step: "idea-hint",
    find: findIdea,
    title: "ネタ",
    description: "作品の設定として資料に入り、下書きのときに読まれる",
  });
};

export { useIdeaHint };
