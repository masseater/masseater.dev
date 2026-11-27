import { lintText } from "@r_masseater/fu4";
import type { Diagnostic, Fu4Error } from "@r_masseater/fu4";
import {
  Array as Arr,
  ConfigProvider,
  Effect,
  Option,
  Record as Rec,
  String as Str,
  pipe,
} from "effect";
import { FetchHttpClient } from "effect/http";

import { zizmor } from "./presets.ts";
import type { ZizmorOptions } from "./presets.ts";

export const TAGGED = "1111111111111111111111111111111111111111";
export const BRANCH_HEAD = "2222222222222222222222222222222222222222";
export const ORPHAN = "3333333333333333333333333333333333333333";
export const OTHER_TAG = "4444444444444444444444444444444444444444";
export const ADVISORY = "GHSA-aaaa-bbbb-cccc";
export const NOT_FOUND = 404;
export const ONCE = 1;
export const NEVER = 0;
export const UPLOAD_PACK = "POST github.com/actions/checkout.git/git-upload-pack";
export const COMPARE_MAIN = `GET api.github.com/repos/actions/checkout/compare/refs/heads/main...${ORPHAN}`;

const FLUSH = "0000";
const HEADER = 4;
const HEX = 16;

export type Respond = () => Response;

export type Routes = Readonly<Record<string, Respond>>;

export type RefLine = readonly [string, string];

export interface Server {
  readonly routes: Routes;
  readonly calls: () => readonly string[];
  readonly record: (key: string) => void;
}

export interface Run {
  readonly uses: string;
  readonly server: Server;
  readonly token?: string;
  readonly zizmor?: ZizmorOptions;
}

export const workflow = (uses: string): string =>
  `name: ci\non: push\npermissions: {}\njobs:\n  test:\n    name: test\n    runs-on: ubuntu-latest\n    steps:\n      - uses: ${uses}\n`;

export const json =
  (body: unknown): Respond =>
  () =>
    Response.json(body);

const pktLine = (data: string): string =>
  `${Str.padStart(HEADER, "0")((data.length + HEADER).toString(HEX))}${data}`;

const refLine = ([oid, name]: RefLine): string => pktLine(`${oid} ${name}\n`);

const packetsOf = (refs: readonly RefLine[]): string =>
  pipe(refs, Arr.map(refLine), Arr.append(FLUSH), Arr.join(""));

export const refsBody =
  (refs: readonly RefLine[]): Respond =>
  () =>
    new Response(packetsOf(refs));

export const BASE_REFS: readonly RefLine[] = [
  [TAGGED, "refs/tags/v4.2.0"],
  [TAGGED, "refs/tags/v4"],
  [BRANCH_HEAD, "refs/heads/main"],
];

export const checkoutRefs = (extra: readonly RefLine[]): Routes => ({
  [UPLOAD_PACK]: refsBody([...BASE_REFS, ...extra]),
});

export const serverOf = (routes: Routes): Server => {
  const calls: string[] = [];
  return {
    routes,
    calls: () => calls,
    record: (key): void => {
      calls.push(key);
    },
  };
};

export const missingRoute = (): Response => new Response("", { status: NOT_FOUND });

export const fetchFor = (server: Server): typeof globalThis.fetch => {
  const fake: typeof globalThis.fetch = (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const key = `${request.method} ${url.host}${url.pathname}`;
    server.record(key);
    return Promise.resolve(Option.getOrElse(Rec.get(server.routes, key), () => missingRoute)());
  };
  return fake;
};

export const linted =
  (root: string) =>
  (run: Run): Effect.Effect<readonly Diagnostic[], Fu4Error> =>
    lintText({
      root,
      path: ".github/workflows/ci.yml",
      text: workflow(run.uses),
      config: zizmor(run.zizmor),
    }).pipe(
      Effect.provideService(FetchHttpClient.Fetch, fetchFor(run.server)),
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromEnv({ env: { GH_TOKEN: run.token ?? "test-token" } }),
      ),
    );

export const rules = (found: readonly Diagnostic[]): readonly string[] =>
  pipe(
    found,
    Arr.map((each) => each.rule),
  );

export const messageOf =
  (rule: string) =>
  (found: readonly Diagnostic[]): string =>
    pipe(
      Arr.findFirst(found, (each) => each.rule === rule),
      Option.match({ onNone: () => "", onSome: (each) => each.message }),
    );

export const count =
  (key: string) =>
  (server: Server): number =>
    Arr.filter(server.calls(), (call) => call === key).length;
