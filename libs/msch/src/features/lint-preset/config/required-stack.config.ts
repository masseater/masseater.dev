import { Array as Arr, Record as Rec, String as Str, pipe } from "effect";

const REACT_STATE_HOOKS: readonly string[] = [
  "useState",
  "useReducer",
  "createContext",
  "useContext",
];
const HAND_WRITTEN_SQL = "SQL を手書きせず Drizzle のクエリビルダーを使う";
const UI_STATE = "UI 状態は effect-atom だけで扱う";

export const INSTRUMENTATION = "計装は Effect のトレーシングだけで扱う";
export const INFRASTRUCTURE =
  "インフラは Alchemy の IaC と Cloudflare だけで扱い、wrangler は使わない";

export const requiredStack: Readonly<Record<string, readonly string[]>> = {
  [UI_STATE]: [
    "zustand",
    "jotai",
    "valtio",
    "recoil",
    "mobx",
    "mobx-*",
    "redux",
    "@reduxjs/*",
    "react-redux",
    "xstate",
    "@xstate/*",
    "nanostores",
    "@nanostores/*",
    "@preact/signals*",
  ],
  "サーバー状態は TanStack Query と Eden だけで扱う": [
    "swr",
    "react-query",
    "@apollo/*",
    "urql",
    "@urql/*",
    "axios",
    "ky",
    "ofetch",
    "got",
    "node-fetch",
    "graphql-request",
    "@trpc/*",
  ],
  "ルーティングとサーバーは TanStack Start と Elysia だけで扱う": [
    "react-router",
    "react-router-dom",
    "next",
    "@remix-run/*",
    "wouter",
    "express",
    "hono",
    "fastify",
    "koa",
    "@nestjs/*",
  ],
  "データベースは Drizzle だけで扱い、スキーマはマイグレーションで生成する": [
    "prisma",
    "@prisma/*",
    "typeorm",
    "sequelize",
    "kysely",
    "knex",
    "@mikro-orm/*",
    "better-sqlite3",
    "pg",
    "mysql2",
  ],
  "認証は better-auth だけで扱う": [
    "next-auth",
    "@auth/*",
    "lucia",
    "passport",
    "passport-*",
    "@clerk/*",
    "firebase/auth",
    "@supabase/*",
  ],
  "UI は shadcn/ui と Tailwind CSS だけで組む": [
    "@mui/*",
    "antd",
    "@chakra-ui/*",
    "@mantine/*",
    "styled-components",
    "@emotion/*",
    "bootstrap",
    "react-bootstrap",
  ],
  "検証、日時、ログ、関数型ユーティリティは Effect だけで扱う": [
    "zod",
    "yup",
    "joi",
    "valibot",
    "arktype",
    "io-ts",
    "superstruct",
    "moment",
    "dayjs",
    "date-fns",
    "luxon",
    "winston",
    "pino",
    "bunyan",
    "loglevel",
    "lodash",
    "lodash-es",
    "ramda",
    "rxjs",
    "fp-ts",
    "neverthrow",
    "ts-results",
    "purify-ts",
  ],
  "CSV は effect/encoding の Csv だけで読み書きする": [
    "papaparse",
    "csv-parse",
    "csv-parser",
    "csv-stringify",
    "fast-csv",
    "@fast-csv/*",
    "d3-dsv",
  ],
  "フィーチャーフラグは OpenFeature だけで扱う": [
    "launchdarkly-*",
    "@launchdarkly/*",
    "@growthbook/*",
    "unleash-client",
    "flagsmith",
    "@vercel/flags",
  ],
  "テストは Vitest と Playwright だけで扱う": [
    "jest",
    "jest-*",
    "@jest/*",
    "ts-jest",
    "mocha",
    "jasmine",
    "jasmine-core",
    "ava",
    "cypress",
    "tap",
    "uvu",
  ],
  "決済は Stripe だけで扱う": [
    "@paypal/*",
    "paypal-rest-sdk",
    "braintree",
    "@paddle/*",
    "@lemonsqueezy/*",
    "square",
  ],
  "整形は Vite+ の vp fmt だけで扱う": [
    "prettier",
    "prettier-plugin-*",
    "@prettier/*",
    "@biomejs/*",
    "dprint",
  ],
  "lint は Vite+ の vp lint だけで扱い、ESLint のプラグインは oxlint の JS プラグインとして読む": [
    "eslint",
    "@eslint/*",
    "eslint-config-*",
    "tslint",
    "standard",
    "xo",
  ],
  [INSTRUMENTATION]: ["@opentelemetry/*", "dd-trace", "newrelic"],
  [INFRASTRUCTURE]: [
    "wrangler",
    "miniflare",
    "@cloudflare/vite-plugin",
    "@vercel/*",
    "@netlify/*",
    "aws-cdk",
    "aws-cdk-lib",
    "@pulumi/*",
    "cdktf",
  ],
};

const requiredStackEntries = Arr.flatMap(Rec.toEntries(requiredStack), ([message, modules]) =>
  pipe(
    modules,
    Arr.map((module) => ({ message, module })),
  ),
);

const requiredStackPaths: readonly Readonly<{ name: string; message: string }>[] = Arr.map(
  pipe(
    requiredStackEntries,
    Arr.filter(({ module }) => !Str.includes("*")(module)),
  ),
  ({ message, module }) => ({ name: module, message }),
);

const requiredStackPatterns: readonly Readonly<{ group: readonly string[]; message: string }>[] =
  pipe(
    requiredStackEntries,
    Arr.map(({ message, module }) => {
      if (Str.includes("*")(module)) {
        return { group: [module, `${module}/**`], message };
      }
      return { group: [`${module}/**`], message };
    }),
  );

export const restrictedImports = {
  paths: [
    {
      name: "react",
      importNames: [...REACT_STATE_HOOKS],
      message: UI_STATE,
    },
    { name: "drizzle-orm", importNames: ["sql"], message: HAND_WRITTEN_SQL },
    { name: "drizzle-orm/sql", message: HAND_WRITTEN_SQL },
    ...requiredStackPaths,
  ],
  patterns: [...requiredStackPatterns],
};
