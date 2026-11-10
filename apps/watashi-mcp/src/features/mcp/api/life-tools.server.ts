import type { Caller } from "@masseater.dev/mcp-tool-call";
import { one, OVERWRITE, READ_ONLY } from "@masseater.dev/mcp-tool-call";
import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { Schema, pipe } from "effect";

import { LifeReadInput, LifeStatsInput, LifeWriteInput } from "./life-input";
import type { LifeReadValue } from "./life-input";
import { routeLifeRead } from "./life-read-route.server";
import { lifeStats } from "./life-stats.server";
import { writeLife } from "./life-write.server";
import { meteredInput, runTool } from "./tool-call.server";

const LIFE_PROJECT = "life";

const WRITE_SCHEMA = LifeWriteInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const READ_SCHEMA = LifeReadInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const STATS_SCHEMA = LifeStatsInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const WRITE_DESCRIPTION =
  "持ち主の人生の記録を 1 件以上まとめて書く。持ち主が出来事・体調・気分・食事・出費・会った人・見た作品・予定・目標・振り返りを話したら呼ぶ。\nsource は said（持ち主が言った）・provided（持ち主が渡した資料）・imported（外部から取り込んだ）のどれか。AI の作業メモ（memory_read・watashi_search の store: memory）や推測を人生の記録に書かない。\n1 つの出来事は 1 件の life_event にし、数えたい値は values に入れる（飲み会なら kind: met、values: {drinks, yen}）。text には持ち主の言葉に近い原文を入れる。\n既存の record を直すときは ref と変える項目だけを渡す（null で項目を消す）。retract と reason で取り消し、restoreTo でそのリビジョンの中身に戻す。\n返り値は {written: ref[], notices}。notices があれば hint に従って直すか、持ち主に確かめる。";

const READ_DESCRIPTION =
  "持ち主の人生の記録を探して読む。入力はどれも省ける。\nref で 1 件を読み、revisions: true も渡すとその書き込みの履歴を返す。record: digest で from〜to の振り返りの材料を返す。record: event_kind で kind・指標・人・場所・タグ・topic の一覧を返す。\nrecord を省くと life_event・profile_fact・owner_reflection をまとめて探す。fields で返す項目を絞れば limit 1000 でも短く読める。\n返り値は {total, items}。各 item は ref と source を持ち、時刻は {utc, jst}、日付は {date, precision}。";

const STATS_DESCRIPTION =
  "指標を from〜to（両端を含む）で集計し、前の期間と比べる。手で数えずにこれを使う。\nmetrics は <指標>（定義の集計方法で集める）、count:<kind>（件数）、days:<kind か指標>（あった日数）。指標と kind の一覧は life_read の record: event_kind。\nwhere で条件に合う日だけを残し、groupBy で日を分けて集計する（{metric, bins}・{by: weekday | kind}・{has}）。\n返り値は指標ごとの {value, total, perLoggedDay, perCalendarDay, min, max, daysLogged, daysWithAnyRecord, buckets?, groups?, compare?}。";

const registerWrite =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "life_write",
      {
        description: WRITE_DESCRIPTION,
        inputSchema: meteredInput({ tool: "life_write", caller, project: LIFE_PROJECT })(
          WRITE_SCHEMA,
        ),
        annotations: OVERWRITE,
      },
      (input) =>
        writeLife({ actor: caller.client })(input.records).pipe(
          runTool({
            tool: "life_write",
            caller,
            project: LIFE_PROJECT,
            input,
            count: ({ written }) => written.length,
          }),
        ),
    );
    return server;
  };

const readLife = (caller: Caller, input: LifeReadValue): Promise<CallToolResult> =>
  routeLifeRead(input).pipe(
    runTool({ tool: "life_read", caller, project: LIFE_PROJECT, input, count: one }),
  );

const registerRead =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "life_read",
      {
        description: READ_DESCRIPTION,
        inputSchema: meteredInput({ tool: "life_read", caller, project: LIFE_PROJECT })(
          READ_SCHEMA,
        ),
        annotations: READ_ONLY,
      },
      (input) => readLife(caller, input),
    );
    return server;
  };

const registerStats =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "life_stats",
      {
        description: STATS_DESCRIPTION,
        inputSchema: meteredInput({ tool: "life_stats", caller, project: LIFE_PROJECT })(
          STATS_SCHEMA,
        ),
        annotations: READ_ONLY,
      },
      (input) =>
        lifeStats(input).pipe(
          runTool({
            tool: "life_stats",
            caller,
            project: LIFE_PROJECT,
            input,
            count: (stats) => stats.length,
          }),
        ),
    );
    return server;
  };

const registerLifeTools =
  (caller: Caller) =>
  (server: McpServer): McpServer =>
    pipe(server, registerWrite(caller), registerRead(caller), registerStats(caller));

export { registerLifeTools };
