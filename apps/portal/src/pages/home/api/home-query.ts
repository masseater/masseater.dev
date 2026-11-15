import type { CredentialState } from "@masseater.dev/portal-protocol";
import { run } from "@r_masseater/workers-tracing/effect";
import type { QueryClient } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Effect } from "effect";

import { credentialsQueries } from "#/entities/credential/index.ts";
import { moneyQueries } from "#/entities/money/index.ts";
import type { OverviewValue, TransactionValue } from "#/entities/money/index.ts";
import { slidesQueries } from "#/entities/slide/index.ts";
import type { DeckValue } from "#/entities/slide/index.ts";
import { watashiQueries } from "#/entities/watashi/index.ts";
import type {
  LifeItemValue,
  MemoValue,
  ProjectValue,
  SessionValue,
} from "#/entities/watashi/index.ts";

const NO_FILTER = {} as const;

const settle = (load: () => Promise<unknown>): Effect.Effect<unknown> =>
  Effect.promise(load).pipe(Effect.catchCause(() => Effect.void));

const RECORDS = watashiQueries.records.get.queryOptions(NO_FILTER);

const MEMOS = watashiQueries.memos.get.queryOptions(NO_FILTER);

const PROJECTS = watashiQueries["memo-projects"].get.queryOptions();

const SESSIONS = watashiQueries.conversations.get.queryOptions();

const DECKS = slidesQueries.decks.get.queryOptions();

const CREDENTIALS = credentialsQueries.get.queryOptions();

const loadOverview = (queryClient: QueryClient): Effect.Effect<OverviewValue> =>
  Effect.promise(() => queryClient.query(moneyQueries.overview.get.queryOptions(NO_FILTER)));

const loadMonth =
  (queryClient: QueryClient) =>
  (overview: OverviewValue): Effect.Effect<unknown> =>
    settle(() =>
      queryClient.query(
        moneyQueries.transactions.get.queryOptions({
          from: overview.period.to,
          to: overview.period.to,
        }),
      ),
    );

const loadMoney = (queryClient: QueryClient): Effect.Effect<unknown> =>
  Effect.flatMap(loadOverview(queryClient), loadMonth(queryClient));

export const loadHomePage = (queryClient: QueryClient): Promise<unknown> =>
  run(
    Effect.all(
      [
        loadMoney(queryClient),
        settle(() => queryClient.query(RECORDS)),
        settle(() => queryClient.query(MEMOS)),
        settle(() => queryClient.query(PROJECTS)),
        settle(() => queryClient.query(SESSIONS)),
        settle(() => queryClient.query(DECKS)),
        settle(() => queryClient.query(CREDENTIALS)),
      ],
      { concurrency: "unbounded" },
    ),
  );

export const useOverview = (): OverviewValue =>
  useSuspenseQuery(moneyQueries.overview.get.queryOptions(NO_FILTER)).data;

export const useMonthTransactions = (month: string): readonly TransactionValue[] =>
  useSuspenseQuery(moneyQueries.transactions.get.queryOptions({ from: month, to: month })).data
    .transactions;

export const useRecords = (): readonly LifeItemValue[] => useSuspenseQuery(RECORDS).data.items;

export const useMemos = (): readonly MemoValue[] => useSuspenseQuery(MEMOS).data.items;

export const useProjects = (): readonly ProjectValue[] => useSuspenseQuery(PROJECTS).data.projects;

export const useSessions = (): readonly SessionValue[] => useSuspenseQuery(SESSIONS).data.sessions;

export const useDecks = (): readonly DeckValue[] => useSuspenseQuery(DECKS).data;

export const useCredentials = (): readonly CredentialState[] => useSuspenseQuery(CREDENTIALS).data;
