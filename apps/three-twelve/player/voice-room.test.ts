import { Option } from "effect";
import { expect, test } from "vite-plus/test";

import { pickRoom } from "./voice-room.ts";

const room = { id: "1", name: "雑談", listeners: 1, joinable: true, afk: false } as const;

test("いちばん人の多い部屋を選ぶ", () => {
  expect(
    pickRoom([room, { ...room, id: "2", listeners: 3 }, { ...room, id: "3", listeners: 2 }]),
  ).toStrictEqual(Option.some({ ...room, id: "2", listeners: 3 }));
});

test("入れない部屋と AFK と無人の部屋は選ばない", () => {
  expect(
    pickRoom([
      { ...room, listeners: 0 },
      { ...room, id: "2", listeners: 5, joinable: false },
      { ...room, id: "3", listeners: 5, afk: true },
    ]),
  ).toStrictEqual(Option.none());
});
