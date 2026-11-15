import { useAtom } from "@effect/atom-react";
import { Option } from "effect";
import { Atom } from "effect/reactivity";

export type Page = "write" | "manuscripts" | "sources";

export interface Screen {
  readonly page: Page;
  readonly manuscript: string | null;
  readonly opening: string | null;
  readonly session: number;
}

export const NEW_MANUSCRIPT = Option.getOrNull(Option.none<string>());
const FIRST_SESSION = 0;
const NEXT_SESSION = 1;

const BLANK_PAGE: Screen = {
  page: "write",
  manuscript: NEW_MANUSCRIPT,
  opening: NEW_MANUSCRIPT,
  session: FIRST_SESSION,
};

/** @internal */
export const screenAtom = Atom.make<Screen>(BLANK_PAGE);

export const useScreen = (): readonly [Screen, (next: Screen) => void] => useAtom(screenAtom);

export const opened =
  (manuscript: string | null) =>
  (screen: Screen): Screen => ({
    page: "write",
    manuscript,
    opening: manuscript,
    session: screen.session + NEXT_SESSION,
  });
