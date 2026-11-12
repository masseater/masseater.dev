import type { EditorView } from "@codemirror/view";
import type { Paragraph, Title } from "@masseater.dev/yohaku-protocol";
import { Duration, HashSet, Option } from "effect";
import { Atom } from "effect/reactivity";

import type { Placed } from "./remark-layout.ts";

interface DraftRequest {
  readonly paragraphId: string;
  readonly attempt: number;
}

const PAUSE = Duration.fromInputUnsafe("1200 millis");
const STALL = Duration.fromInputUnsafe("8 seconds");
const NO_TITLE = Option.getOrNull(Option.none<typeof Title.Type>());

/** @internal */
const paragraphsAtom = Atom.make<readonly (typeof Paragraph.Type)[]>([]);
/** @internal */
const pausedAtom = Atom.debounce(paragraphsAtom, PAUSE);
/** @internal */
const stalledAtom = Atom.debounce(paragraphsAtom, STALL);
/** @internal */
const editorAtom = Atom.make(Option.none<EditorView>());
/** @internal */
const placedAtom = Atom.make<readonly Placed[]>([]);
/** @internal */
const manuscriptIdAtom = Atom.make(Option.none<string>());
/** @internal */
const draftRequestAtom = Atom.make(Option.none<DraftRequest>());
/** @internal */
const keptAtom = Atom.make(HashSet.empty<string>());
/** @internal */
const titleAtom = Atom.make<typeof Title.Type | null>(NO_TITLE);
/** @internal */
const rewritingAtom = Atom.make(Option.none<string>());

export {
  NO_TITLE,
  draftRequestAtom,
  editorAtom,
  keptAtom,
  manuscriptIdAtom,
  paragraphsAtom,
  pausedAtom,
  placedAtom,
  rewritingAtom,
  stalledAtom,
  titleAtom,
};
export type { DraftRequest };
