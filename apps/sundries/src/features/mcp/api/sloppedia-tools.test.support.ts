import {
  Array as Arr,
  Effect,
  MutableRef,
  Option,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { constVoid } from "effect/Function";
import { vi } from "vite-plus/test";

type Answer = Readonly<{ status: number; body: unknown }>;

type Scene = Readonly<{
  branches: readonly string[];
  files: Readonly<Record<string, string>>;
  openPulls: Readonly<Record<string, number>>;
  commit: Answer;
  graphql: Answer;
}>;

type Sent = Readonly<{ method: string; path: string; body: unknown }>;

type Route = Readonly<{
  method: string;
  path: RegExp;
  answer: (scene: Scene, match: readonly string[], body: unknown) => Answer;
}>;

const REPO = "/repos/masseater/masseater.dev";

const MAIN_SHA = "main-sha";

const NEW_PULL = 41;

const OK = 200;

const CREATED = 201;

const NOT_FOUND = 404;

const UNPROCESSABLE = 422;

const ok = (body: unknown): Answer => ({ status: OK, body });

const created = (body: unknown): Answer => ({ status: CREATED, body });

const missing: Answer = { status: NOT_FOUND, body: { message: "Not Found" } };

const refAt = (ref: string, sha: string): unknown => ({
  ref: `refs/heads/${ref}`,
  node_id: `REF_${ref}`,
  url: `https://api.github.com${REPO}/git/refs/heads/${ref}`,
  object: { sha, type: "commit", url: "https://api.github.com/commit" },
});

const pullNumbered = (number: number): unknown => ({
  number,
  node_id: `PR_${String(number)}`,
  html_url: `https://github.com/masseater/masseater.dev/pull/${String(number)}`,
});

const RefBody = Schema.Struct({ ref: Schema.String });

const refNameOf = (body: unknown): string =>
  pipe(
    Schema.decodeUnknownOption(RefBody)(body),
    Option.match({
      onNone: () => "",
      onSome: ({ ref }) => Str.replace(/^refs\/heads\//u, "")(ref),
    }),
  );

const DEFAULT_SCENE: Scene = {
  branches: [],
  files: {},
  openPulls: {},
  commit: created({ content: { sha: "file-sha" }, commit: { sha: "commit-sha" } }),
  graphql: ok({ data: { enablePullRequestAutoMerge: {} } }),
};

const scene = MutableRef.make(DEFAULT_SCENE);

const sent = MutableRef.make<readonly Sent[]>([]);

const routes: readonly Route[] = [
  {
    method: "GET",
    path: new RegExp(`^${REPO}/git/ref/heads/main$`, "u"),
    answer: () => ok(refAt("main", MAIN_SHA)),
  },
  {
    method: "GET",
    path: new RegExp(`^${REPO}/git/ref/heads/(?<branch>.+)$`, "u"),
    answer: ({ branches }, [, branch = ""]) =>
      Option.match(
        Option.liftPredicate(branch, (name) => Arr.contains(branches, name)),
        {
          onNone: () => missing,
          onSome: (name) => ok(refAt(name, "old-sha")),
        },
      ),
  },
  {
    method: "POST",
    path: new RegExp(`^${REPO}/git/refs$`, "u"),
    answer: ({ branches }, _match, body) =>
      Option.match(
        Option.liftPredicate(refNameOf(body), (name) => !Arr.contains(branches, name)),
        {
          onNone: () => ({ status: UNPROCESSABLE, body: { message: "Reference already exists" } }),
          onSome: (name) => created(refAt(name, MAIN_SHA)),
        },
      ),
  },
  {
    method: "PATCH",
    path: new RegExp(`^${REPO}/git/refs/heads/(?<branch>.+)$`, "u"),
    answer: (_scene, [, branch = ""]) => ok(refAt(branch, MAIN_SHA)),
  },
  {
    method: "GET",
    path: new RegExp(`^${REPO}/contents/(?<path>.+)$`, "u"),
    answer: ({ files }, [, path = ""]) =>
      Option.match(Rec.get(files, path), {
        onNone: () => missing,
        onSome: (sha) => ok({ type: "file", sha, path, name: path }),
      }),
  },
  {
    method: "PUT",
    path: new RegExp(`^${REPO}/contents/(?<path>.+)$`, "u"),
    answer: ({ commit }) => commit,
  },
  {
    method: "GET",
    path: new RegExp(`^${REPO}/pulls$`, "u"),
    answer: ({ openPulls }) => ok(pipe(Rec.values(openPulls), Arr.map(pullNumbered))),
  },
  {
    method: "POST",
    path: new RegExp(`^${REPO}/pulls$`, "u"),
    answer: () => created(pullNumbered(NEW_PULL)),
  },
  {
    method: "PUT",
    path: new RegExp(`^${REPO}/pulls/(?<number>\\d+)/merge$`, "u"),
    answer: () => ok({ merged: true, sha: "merge-sha", message: "merged" }),
  },
  { method: "POST", path: /^\/graphql$/u, answer: ({ graphql }) => graphql },
];

const JsonBody = Schema.fromJsonString(Schema.Unknown);

const bodyOf = (request: Request): Effect.Effect<unknown> =>
  Effect.promise(() => request.text()).pipe(
    Effect.flatMap((text) =>
      Option.match(Option.liftPredicate(text, Str.isNonEmpty), {
        onNone: () => Effect.succeedNone,
        onSome: (value) => Schema.decodeEffect(JsonBody)(value).pipe(Effect.option),
      }),
    ),
    Effect.map(Option.getOrUndefined),
  );

const answerFor = (method: string, path: string, body: unknown): Answer =>
  pipe(
    routes,
    Arr.findFirst((route) =>
      pipe(
        Option.liftPredicate(route, () => route.method === method),
        Option.flatMap(({ path: pattern }) => Option.fromNullishOr(pattern.exec(path))),
        Option.map((match) => route.answer(MutableRef.get(scene), match, body)),
      ),
    ),
    Option.getOrElse(() => missing),
  );

const fakeGithub: typeof fetch = (input, init) =>
  Effect.runPromise(
    Effect.gen(function* answerGithub() {
      const request = new Request(input, init);
      const path = decodeURIComponent(new URL(request.url).pathname);
      const body = yield* bodyOf(request);
      MutableRef.update(sent, Arr.append({ method: request.method, path, body }));
      const { status, body: answer } = answerFor(request.method, path, body);
      return Response.json(answer, { status });
    }),
  );

const stubGithub = (): void => {
  vi.stubGlobal("fetch", fakeGithub);
};

const setScene = (overrides: Partial<Scene>): void => {
  MutableRef.set(scene, { ...DEFAULT_SCENE, ...overrides });
  MutableRef.set(sent, []);
};

const sentRequests = (): readonly Sent[] => MutableRef.get(sent);

const env = {
  TOOL_CALLS: { writeDataPoint: constVoid },
  SLOPPEDIA_GITHUB: { fetch: (): Promise<Response> => Promise.resolve(new Response("token")) },
};

export { MAIN_SHA, NEW_PULL, REPO, env, sentRequests, setScene, stubGithub };
export type { Answer, Scene, Sent };
