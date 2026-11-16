import type { Option } from "effect";
import type { AstNode } from "langium";

import type { Edit, Hit, Note, Slice } from "#/entities/song/events.ts";

export type LineKind =
  | { readonly kind: "kit"; readonly voices: readonly string[]; readonly kit: string }
  | { readonly kind: "instrument" }
  | { readonly kind: "audio" }
  | { readonly kind: "master" };

export interface Placed {
  readonly offset: number;
  readonly length: number;
  readonly nudgeMilliseconds: number;
}

export type NoteFields = Pick<
  Note,
  "velocity" | "gate" | "articulation" | "lyric" | "bend" | "params"
> & { readonly tie: Option.Option<AstNode> };

export type NoteItem = Placed &
  NoteFields &
  Pick<Note, "midi" | "cents"> & { readonly kind: "note" };

export type Item =
  | NoteItem
  | (Placed & Pick<Hit, "voice" | "velocity" | "params"> & { readonly kind: "hit" })
  | (Placed & Pick<Slice, "sample" | "index" | "velocity" | "params"> & { readonly kind: "slice" })
  | (Placed & Pick<Edit, "edit" | "every" | "fadeMilliseconds"> & { readonly kind: "edit" });
