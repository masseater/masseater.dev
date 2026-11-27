import { Array as Arr, MutableRef } from "effect";

import type { AudioStore, Limiter, PlayerRpc } from "./routes.ts";

export const KNOWN_TOKEN = "known.bot-token";

const calls = MutableRef.make<readonly string[]>([]);

const record = (call: string): void => {
  MutableRef.update(calls, Arr.append(call));
};

const player: PlayerRpc = {
  setToken: () => {
    record("setToken");
    return Promise.resolve();
  },
  isToken: (token) => {
    record("isToken");
    return Promise.resolve(token === KNOWN_TOKEN);
  },
  lastRun: () => {
    record("lastRun");
    return Promise.resolve({ status: "played" });
  },
  arm: () => {
    record("arm");
    return Promise.resolve();
  },
};

const audio: AudioStore = {
  put: () => {
    record("audio.put");
    return Promise.resolve();
  },
};

const flooded = MutableRef.make(false);

const limited = MutableRef.make<readonly string[]>([]);

const limiter: Limiter = {
  limit: ({ key }) => {
    MutableRef.update(limited, Arr.append(key));
    return Promise.resolve({ success: !MutableRef.get(flooded) });
  },
};

export const stage = { player, audio, limiter };

export const recordedCalls = (): readonly string[] => MutableRef.get(calls);

export const flood = (): void => {
  MutableRef.set(flooded, true);
};

export const limitedKeys = (): readonly string[] => MutableRef.get(limited);

export const resetCalls = (): void => {
  MutableRef.set(calls, []);
  MutableRef.set(flooded, false);
  MutableRef.set(limited, []);
};
