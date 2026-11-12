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

const paragraphsAtom = Atom.make<readonly (typeof Paragraph.Type)[]>([]);
const pausedAtom = Atom.debounce(paragraphsAtom, PAUSE);
const stalledAtom = Atom.debounce(paragraphsAtom, STALL);
const editorAtom = Atom.make(Option.none<EditorView>());
const placedAtom = Atom.make<readonly Placed[]>([]);
const manuscriptIdAtom = Atom.make(Option.none<string>());
const draftRequestAtom = Atom.make(Option.none<DraftRequest>());
const keptAtom = Atom.make(HashSet.empty<string>());
const titleAtom = Atom.make<typeof Title.Type | null>(NO_TITLE);
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
