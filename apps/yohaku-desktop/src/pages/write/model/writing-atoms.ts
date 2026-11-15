import type { EditorView } from "@codemirror/view";
import type { Paragraph, Title } from "@masseater.dev/yohaku-protocol";
import { Duration, HashSet, Option } from "effect";
import { Atom } from "effect/reactivity";

import type { Placed } from "./remark-layout.ts";

export interface DraftRequest {
  readonly paragraphId: string;
  readonly attempt: number;
}

const PAUSE = Duration.fromInputUnsafe("1200 millis");
const STALL = Duration.fromInputUnsafe("8 seconds");
export const NO_TITLE = Option.getOrNull(Option.none<typeof Title.Type>());

/** @internal */
export const paragraphsAtom = Atom.make<readonly (typeof Paragraph.Type)[]>([]);
/** @internal */
export const pausedAtom = Atom.debounce(paragraphsAtom, PAUSE);
/** @internal */
export const stalledAtom = Atom.debounce(paragraphsAtom, STALL);
/** @internal */
export const editorAtom = Atom.make(Option.none<EditorView>());
/** @internal */
export const placedAtom = Atom.make<readonly Placed[]>([]);
/** @internal */
export const manuscriptIdAtom = Atom.make(Option.none<string>());
/** @internal */
export const draftRequestAtom = Atom.make(Option.none<DraftRequest>());
/** @internal */
export const keptAtom = Atom.make(HashSet.empty<string>());
/** @internal */
export const titleAtom = Atom.make<typeof Title.Type | null>(NO_TITLE);
/** @internal */
export const rewritingAtom = Atom.make(Option.none<string>());
/** @internal */
export const openedParagraphsAtom = Atom.make<readonly (typeof Paragraph.Type)[]>([]);
