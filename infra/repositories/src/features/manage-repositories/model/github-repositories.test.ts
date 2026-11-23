import { Array as Arr, Effect, Option, Ref, Schema, String as Str, pipe } from "effect";
import type { DefaultBodyType, StrictRequest } from "msw";
import { http } from "msw/http";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vite-plus/test";

import { updateRepository } from "./github-repositories.ts";
import type { RepositorySettingsProps } from "./github-repositories.ts";

const API = "https://api.github.com";
const REPOSITORY = "/repos/masseater/site";
const NO_CONTENT = 204;

const PUBLIC: RepositorySettingsProps = {
  owner: "masseater",
  name: "site",
  allowUpdateBranch: true,
  secretScanning: true,
  actionsCreatePullRequests: true,
  collaboratorPullRequests: true,
  vulnerabilityReporting: true,
};

const PRIVATE: RepositorySettingsProps = {
  ...PUBLIC,
  secretScanning: false,
  collaboratorPullRequests: false,
  vulnerabilityReporting: false,
};

type Call = Readonly<{ route: string; body: string }>;

const Update = Schema.fromJsonString(
  Schema.Struct({ pull_request_creation_policy: Schema.optionalKey(Schema.String) }),
);

const network = setupServer();

beforeAll(() => {
  vi.stubEnv("GITHUB_TOKEN", "obviously-fake-token");
  network.listen({ onUnhandledFrame: "error" });
});

afterEach(() => {
  network.resetHandlers();
});

afterAll(() => {
  vi.unstubAllEnvs();
  network.close();
});

const answer = (url: string): Response => {
  if (Str.endsWith("/private-vulnerability-reporting")(url)) {
    return new Response(Option.getOrNull(Option.none()), { status: NO_CONTENT });
  }
  return Response.json({});
};

const callsFor = (settings: RepositorySettingsProps): Effect.Effect<readonly Call[]> =>
  Effect.gen(function* apply() {
    const calls = yield* Ref.make<readonly Call[]>([]);
    const context = yield* Effect.context();
    const record = (request: StrictRequest<DefaultBodyType>): Promise<Response> => {
      const route = `${request.method} ${new URL(request.url).pathname}`;
      const answered = answer(request.url);
      return Effect.runPromiseWith(context)(
        Effect.promise(() => request.text()).pipe(
          Effect.flatMap((body) => Ref.update(calls, Arr.append({ route, body }))),
          Effect.as(answered),
        ),
      );
    };
    network.use(http.all(`${API}/*`, ({ request }) => record(request)));
    yield* updateRepository(settings);
    return yield* Ref.get(calls);
  });

const policyOf = (calls: readonly Call[]): Option.Option<string> =>
  pipe(
    calls,
    Arr.findFirst(({ route }) => route === `PATCH ${REPOSITORY}`),
    Option.flatMap(({ body }) => Schema.decodeOption(Update)(body)),
    Option.flatMapNullishOr((update) => update.pull_request_creation_policy),
  );

const routesOf = (calls: readonly Call[]): readonly string[] =>
  pipe(
    calls,
    Arr.map(({ route }) => route),
  );

test("public repositories take pull requests from collaborators only and receive private vulnerability reports", () =>
  Effect.runPromise(
    Effect.gen(function* open() {
      const calls = yield* callsFor(PUBLIC);
      expect(policyOf(calls)).toStrictEqual(Option.some("collaborators_only"));
      expect(routesOf(calls)).toStrictEqual([
        `PATCH ${REPOSITORY}`,
        `PUT ${REPOSITORY}/actions/permissions/workflow`,
        `PUT ${REPOSITORY}/private-vulnerability-reporting`,
      ]);
    }),
  ));

test("private repositories keep their pull request policy and are not asked for vulnerability reporting", () =>
  Effect.runPromise(
    Effect.gen(function* closed() {
      const calls = yield* callsFor(PRIVATE);
      expect(policyOf(calls)).toStrictEqual(Option.none());
      expect(routesOf(calls)).toStrictEqual([
        `PATCH ${REPOSITORY}`,
        `PUT ${REPOSITORY}/actions/permissions/workflow`,
      ]);
    }),
  ));
