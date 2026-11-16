import { Array as Arr, Option, pipe } from "effect";

import type { Session } from "#/entities/song/index.ts";
import { clear, penOf } from "#/widgets/daw-view/model/pen.ts";
import type { Canvas, Pen, Viewport } from "#/widgets/daw-view/model/pen.ts";

import { grid, ruler } from "./arrange-ruler.ts";
import { lanes, tracks } from "./arrange-tracks.ts";

const LEFT = 0;

export interface ArrangeFrame {
  readonly canvas: Canvas;
  readonly viewport: Viewport;
  readonly session: Session;
  readonly selected: Option.Option<string>;
}

const highlight = (pen: Pen, { session, selected }: ArrangeFrame): void => {
  const track = pipe(
    session.tracks,
    Arr.findFirst((item) => Option.contains(selected, item.name)),
  );
  if (Option.isSome(track)) {
    pen.context.fillStyle = pen.theme.lane;
    pen.context.fillRect(LEFT, track.value.top, pen.width, track.value.height);
  }
};

export const drawArrange = (frame: ArrangeFrame): void => {
  const pen = penOf(frame.canvas)(frame.viewport);
  clear(pen);
  highlight(pen, frame);
  grid(pen);
  ruler(pen)(frame.session.roots);
  tracks(pen)(frame.session.tracks);
  lanes(pen)(frame.session.lanes);
};
