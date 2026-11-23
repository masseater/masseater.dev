import { expect, test } from "vite-plus/test";

import { floodGuarded } from "./route-handlers.server.ts";
import type { FloodLimiter } from "./route-handlers.server.ts";

const OK = 200;
const TOO_MANY = 429;
const IP = "192.0.2.1";
const URL = "https://owner.example/api/auth/get-session";

const serve = (): Promise<Response> => Promise.resolve(new Response("served"));

type Outcome = () => Promise<Readonly<{ success: boolean }>>;

const within: Outcome = () => Promise.resolve({ success: true });

const over: Outcome = () => Promise.resolve({ success: false });

const down: Outcome = () => Promise.reject(new Error("limiter is down"));

const answerFrom = (
  outcome: Outcome,
): Promise<Readonly<{ status: number; keys: readonly string[] }>> => {
  const keys: string[] = [];
  const limiter: FloodLimiter = {
    limit: ({ key }) => {
      keys.push(key);
      return outcome();
    },
  };
  return floodGuarded(limiter)(serve)(
    new Request(URL, { headers: { "cf-connecting-ip": IP } }),
  ).then((response) => ({ status: response.status, keys }));
};

test("上限の内なら、接続元の IP で数えて元の処理に渡す", () =>
  expect(answerFrom(within)).resolves.toStrictEqual({ status: OK, keys: [IP] }));

test("上限を超えたら、元の処理に渡さず 429 を返す", () =>
  expect(answerFrom(over)).resolves.toMatchObject({ status: TOO_MANY }));

test("数えられなかったときは、締め出さずに元の処理に渡す", () =>
  expect(answerFrom(down)).resolves.toMatchObject({ status: OK }));
