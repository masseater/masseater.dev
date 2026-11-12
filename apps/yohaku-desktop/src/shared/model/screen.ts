import { useAtom } from "@effect/atom-react";
import { Option } from "effect";
import { Atom } from "effect/reactivity";

type Page = "write" | "manuscripts" | "sources";

interface Screen {
  readonly page: Page;
  readonly manuscript: string | null;
  readonly opening: string | null;
  readonly session: number;
}

const NEW_MANUSCRIPT = Option.getOrNull(Option.none<string>());
const FIRST_SESSION = 0;
const NEXT_SESSION = 1;

const BLANK_PAGE: Screen = {
  page: "write",
  manuscript: NEW_MANUSCRIPT,
  opening: NEW_MANUSCRIPT,
  session: FIRST_SESSION,
};

/** @internal */
const screenAtom = Atom.make<Screen>(BLANK_PAGE);

const useScreen = (): readonly [Screen, (next: Screen) => void] => useAtom(screenAtom);

const opened =
  (manuscript: string | null) =>
  (screen: Screen): Screen => ({
    page: "write",
    manuscript,
    opening: manuscript,
    session: screen.session + NEXT_SESSION,
  });

export { BLANK_PAGE, NEW_MANUSCRIPT, opened, screenAtom, useScreen };
export type { Page, Screen };
