import { Array as Arr, MutableRef } from "effect";

const KNOWN_TOKEN = "known.bot-token";

const calls = MutableRef.make<readonly string[]>([]);

const record = (call: string): void => {
  MutableRef.update(calls, Arr.append(call));
};

type FakePlayer = Readonly<{
  isToken: (token: string) => Promise<boolean>;
  lastRun: () => Promise<unknown>;
  arm: () => Promise<void>;
}>;

const player: FakePlayer = {
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

const env = {
  PLAYER: { getByName: (): FakePlayer => player },
  AUDIO: {
    put: (): Promise<void> => {
      record("audio.put");
      return Promise.resolve();
    },
  },
};

const DurableObject = Object;

const recordedCalls = (): readonly string[] => MutableRef.get(calls);

const resetCalls = (): void => {
  MutableRef.set(calls, []);
};

export { DurableObject, KNOWN_TOKEN, env, recordedCalls, resetCalls };
