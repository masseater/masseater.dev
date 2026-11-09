import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { Schema, pipe } from "effect";

import type { Caller } from "./caller";
import {
  MemoryReadInput,
  MemoryWriteInput,
  WatashiProfileInput,
  WatashiSearchInput,
} from "./memory-input";
import type { MemoryReadValue } from "./memory-input";
import { readMemory } from "./memory-read.server";
import { writeMemory } from "./memory-write.server";
import { NO_PROJECT, OVERWRITE, READ_ONLY, meteredInput, one, runTool } from "./tool-call.server";
import { watashiProfile } from "./watashi-profile.server";
import { watashiSearch } from "./watashi-search.server";

const ALL_PROJECTS = "*";

const MEMORY_WRITE_SCHEMA = MemoryWriteInput.pipe(
  Schema.toStandardSchemaV1,
  Schema.toStandardJSONSchemaV1,
);

const MEMORY_READ_SCHEMA = MemoryReadInput.pipe(
  Schema.toStandardSchemaV1,
  Schema.toStandardJSONSchemaV1,
);

const SEARCH_SCHEMA = WatashiSearchInput.pipe(
  Schema.toStandardSchemaV1,
  Schema.toStandardJSONSchemaV1,
);

const PROFILE_SCHEMA = WatashiProfileInput.pipe(
  Schema.toStandardSchemaV1,
  Schema.toStandardJSONSchemaV1,
);

const MEMORY_WRITE_DESCRIPTION =
  "AI の作業メモを書く。project と name で 1 件を指し、無ければ作り（description と content が要る）、あれば渡した項目だけを置き換える。\nプロジェクトの決まりや経緯、人生の記録を読んだ要約や気づきを残す。人生の記録から作ったメモは evidence に元の ref を入れる。\nretract と reason で取り消し、restoreTo でそのリビジョンの中身に戻す。返り値は {written: ref[], notices}。";

const MEMORY_READ_DESCRIPTION =
  "AI の作業メモを探して読む。作業を始める前に、題材のプロジェクトや話題の語で呼び、関係する決定や好みを読む。\nproject と name で 1 件を読み、revisions: true も渡すと書き込みの履歴を返す。\n作業メモは AI が書いたもので、持ち主の言葉ではない。作業メモをもとに life_write しない。";

const SEARCH_DESCRIPTION =
  "人生の記録と AI の作業メモをまとめて、自然な言葉で探す。\n返り値は {total, countsByStore: {life, memory}, items}。各 item の store が life なら持ち主の記録、memory なら AI の作業メモで、持ち主の言葉として扱わない。";

const PROFILE_DESCRIPTION =
  "持ち主がどんな人かの概要を 1 回で返す。会話の最初に呼ぶ。\n返り値は {ownerFacts, activeGoals, openTodos, people, recentMedia, aiSummary}。aiSummary だけは AI の作業メモ（store: memory）で、持ち主の言葉ではない。";

const registerMemoryWrite =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "memory_write",
      {
        description: MEMORY_WRITE_DESCRIPTION,
        inputSchema: meteredInput({ tool: "memory_write", caller, project: NO_PROJECT })(
          MEMORY_WRITE_SCHEMA,
        ),
        annotations: OVERWRITE,
      },
      (input) =>
        writeMemory({ actor: caller.client })(input).pipe(
          runTool({ tool: "memory_write", caller, project: input.project, input, count: one }),
        ),
    );
    return server;
  };

const readMemoryTool = (caller: Caller, input: MemoryReadValue): Promise<CallToolResult> =>
  readMemory(input).pipe(
    runTool({
      tool: "memory_read",
      caller,
      project: input.project ?? ALL_PROJECTS,
      input,
      count: one,
    }),
  );

const registerMemoryRead =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "memory_read",
      {
        description: MEMORY_READ_DESCRIPTION,
        inputSchema: meteredInput({ tool: "memory_read", caller, project: NO_PROJECT })(
          MEMORY_READ_SCHEMA,
        ),
        annotations: READ_ONLY,
      },
      (input) => readMemoryTool(caller, input),
    );
    return server;
  };

const registerSearch =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "watashi_search",
      {
        description: SEARCH_DESCRIPTION,
        inputSchema: meteredInput({ tool: "watashi_search", caller, project: NO_PROJECT })(
          SEARCH_SCHEMA,
        ),
        annotations: READ_ONLY,
      },
      (input) =>
        watashiSearch(input).pipe(
          runTool({ tool: "watashi_search", caller, project: NO_PROJECT, input, count: one }),
        ),
    );
    return server;
  };

const registerProfile =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "watashi_profile",
      {
        description: PROFILE_DESCRIPTION,
        inputSchema: meteredInput({ tool: "watashi_profile", caller, project: NO_PROJECT })(
          PROFILE_SCHEMA,
        ),
        annotations: READ_ONLY,
      },
      (input) =>
        watashiProfile.pipe(
          runTool({ tool: "watashi_profile", caller, project: NO_PROJECT, input, count: one }),
        ),
    );
    return server;
  };

const registerWatashiTools =
  (caller: Caller) =>
  (server: McpServer): McpServer =>
    pipe(
      server,
      registerMemoryWrite(caller),
      registerMemoryRead(caller),
      registerSearch(caller),
      registerProfile(caller),
    );

export { registerWatashiTools };
