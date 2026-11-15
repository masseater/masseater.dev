import { Array as Arr, Option, Order, pipe } from "effect";

export type VoiceRoom = Readonly<{
  id: string;
  name: string;
  listeners: number;
  joinable: boolean;
  afk: boolean;
}>;

const NOBODY = 0;

const byListeners = Order.mapInput(Order.Number, (room: VoiceRoom) => room.listeners);

export const pickRoom = (rooms: readonly VoiceRoom[]): Option.Option<VoiceRoom> =>
  pipe(
    rooms,
    Arr.filter((room) => room.joinable && !room.afk && room.listeners > NOBODY),
    Arr.match({
      onEmpty: () => Option.none(),
      onNonEmpty: (candidates) => Option.some(Arr.max(candidates, byListeners)),
    }),
  );
