import { Option } from "effect";

import { deckOf, headerOf } from "./page.ts";
import type { Deck, Header, Heading } from "./page.ts";
import { creditsOf, rollPanel, tracksPanel } from "./panels.ts";
import type { Credit, RollPanel, TracksPanel } from "./panels.ts";

const ROOT = [
  "mx-auto",
  "max-w-[1180px]",
  "pt-10",
  "pr-[max(16px,env(safe-area-inset-right,0px))]",
  "pb-14",
  "pl-[max(16px,env(safe-area-inset-left,0px))]",
  "max-sm:pt-7",
  "max-sm:pb-12",
] as const;

export interface Parts {
  readonly root: HTMLElement;
  readonly header: Header;
  readonly deck: Deck;
  readonly tracks: TracksPanel;
  readonly roll: RollPanel;
}

export interface Surfaces {
  readonly wave: CanvasRenderingContext2D;
  readonly spectrum: CanvasRenderingContext2D;
  readonly arrange: CanvasRenderingContext2D;
  readonly roll: CanvasRenderingContext2D;
}

export interface Content extends Heading {
  readonly credits: readonly Credit[];
}

export const partsOf =
  (root: HTMLElement) =>
  (content: Content): Parts => {
    const parts = {
      root,
      header: headerOf(content),
      deck: deckOf(),
      tracks: tracksPanel(),
      roll: rollPanel(),
    };
    root.classList.add(...ROOT);
    root.append(
      parts.header.node,
      parts.deck.node,
      parts.tracks.node,
      parts.roll.node,
      creditsOf(content.credits),
    );
    return parts;
  };

const contextOf = (canvas: HTMLCanvasElement): Option.Option<CanvasRenderingContext2D> =>
  Option.fromNullishOr(canvas.getContext("2d"));

export const surfacesOf = ({ deck, tracks, roll }: Parts): Option.Option<Surfaces> =>
  Option.all({
    wave: contextOf(deck.wave),
    spectrum: contextOf(deck.spectrum),
    arrange: contextOf(tracks.canvas),
    roll: contextOf(roll.canvas),
  });
