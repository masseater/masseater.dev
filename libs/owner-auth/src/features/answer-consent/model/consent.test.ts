import { Option } from "effect";
import { expect, test } from "vite-plus/test";

import { consentView, validateConsentSearch } from "./consent.ts";

const CLIENT_ID = "kXwPqLmNoRsTuVyZ";

const CLIENT_NAME = "Claude";

const REDIRECT_URI = "https://claude.ai/api/mcp/auth_callback";

const REDIRECT_HOST = "claude.ai";

const SCOPE = "openid profile offline_access";

const CLIENT_ID_DETAIL = { label: "クライアント ID", values: [CLIENT_ID] };

const REGISTRATION_DETAIL = { label: "登録", values: ["未認証の自己登録"] };

const REDIRECT_LABEL = "リダイレクト先";

const REDIRECT_URI_DETAIL = { label: "リダイレクト URI", values: [REDIRECT_URI] };

const SCOPES_DETAIL = { label: "スコープ", values: ["openid", "profile", "offline_access"] };

const REQUEST = {
  clientId: CLIENT_ID,
  clientName: Option.some(CLIENT_NAME),
  redirectUri: Option.some(REDIRECT_URI),
  requestedScope: Option.some(SCOPE),
};

const AUTHORIZE_QUERY = {
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  scope: SCOPE,
};

const redirectDetail = (shown: string): Readonly<{ label: string; values: readonly string[] }> => ({
  label: REDIRECT_LABEL,
  values: [shown],
});

test("クライアントの情報とリダイレクト先がそろえば、名前・ID・自己登録・ホスト・URI・スコープを出して許可できる", () => {
  expect(consentView(REQUEST)).toStrictEqual({
    name: CLIENT_NAME,
    details: [
      CLIENT_ID_DETAIL,
      REGISTRATION_DETAIL,
      redirectDetail(REDIRECT_HOST),
      REDIRECT_URI_DETAIL,
      SCOPES_DETAIL,
    ],
    allow: "enabled",
  });
});

test.each([
  ["https://claude.ai@evil.example/callback", "evil.example"],
  ["https://claude.ai.evil.example:8443/callback", "claude.ai.evil.example:8443"],
])("https のリダイレクト先 %s は、コードが届くホスト %s で出す", (redirectUri, host) => {
  expect(consentView({ ...REQUEST, redirectUri: Option.some(redirectUri) }).details).toContainEqual(
    redirectDetail(host),
  );
});

test.each([
  ["http://127.0.0.1:33418/callback"],
  ["someapp://claude.ai/callback"],
  ["com.example.app:/callback"],
  ["https://"],
  ["リダイレクト先ではない文字列"],
])(
  "https でないか URL として読めないリダイレクト先 %s は、そのまま 1 度だけ出す",
  (redirectUri) => {
    expect(
      consentView({ ...REQUEST, redirectUri: Option.some(redirectUri) }).details,
    ).toStrictEqual([
      CLIENT_ID_DETAIL,
      REGISTRATION_DETAIL,
      redirectDetail(redirectUri),
      SCOPES_DETAIL,
    ]);
  },
);

test("https のリダイレクト先は、ホストとは別に URI の全体も出す", () => {
  const redirectUri = "https://claude.ai@evil.example/callback?next=1";
  expect(consentView({ ...REQUEST, redirectUri: Option.some(redirectUri) }).details).toContainEqual(
    { label: REDIRECT_URI_DETAIL.label, values: [redirectUri] },
  );
});

test("スコープは空白で区切り、空の要素と重複を除いて並べる", () => {
  expect(
    consentView({ ...REQUEST, requestedScope: Option.some(" openid  profile openid ") }).details,
  ).toContainEqual({ label: SCOPES_DETAIL.label, values: ["openid", "profile"] });
});

test("スコープの指定が無ければ、スコープの項目を出さない", () => {
  expect(consentView({ ...REQUEST, requestedScope: Option.none() }).details).toStrictEqual([
    CLIENT_ID_DETAIL,
    REGISTRATION_DETAIL,
    redirectDetail(REDIRECT_HOST),
    REDIRECT_URI_DETAIL,
  ]);
});

test("クライアントの情報を読めていなければ、クライアント ID を名前にして許可させない", () => {
  expect(consentView({ ...REQUEST, clientName: Option.none() })).toStrictEqual({
    name: CLIENT_ID,
    details: [
      CLIENT_ID_DETAIL,
      REGISTRATION_DETAIL,
      redirectDetail(REDIRECT_HOST),
      REDIRECT_URI_DETAIL,
      SCOPES_DETAIL,
    ],
    allow: "disabled",
  });
});

test("リダイレクト先が分からなければ、その項目を出さず許可させない", () => {
  expect(consentView({ ...REQUEST, redirectUri: Option.none() })).toStrictEqual({
    name: CLIENT_NAME,
    details: [CLIENT_ID_DETAIL, REGISTRATION_DETAIL, SCOPES_DETAIL],
    allow: "disabled",
  });
});

test("同意画面の検索パラメータから、リダイレクト先とスコープを読み取る", () =>
  expect(
    Promise.resolve(validateConsentSearch["~standard"].validate({ ...AUTHORIZE_QUERY })),
  ).resolves.toMatchObject({ value: AUTHORIZE_QUERY }));
