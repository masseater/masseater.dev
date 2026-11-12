import { Fact } from "@masseater.dev/yohaku-protocol";
import { Array, Effect, Schema, String, pipe } from "effect";

import { NO_MANUSCRIPT, addSource, replaceManuscriptSource } from "#entities/source";
import { judgeAs } from "#shared/agent";

const WEB_TOOLS: readonly string[] = ["WebFetch"];
const NO_TOOLS: readonly string[] = [];
const BUILT_IN_AGENT = "内蔵のエージェント";
const MANUSCRIPT_LABEL = "本文";
const LABEL_START = 0;
const LABEL_END = 40;
const LINE_BREAK = "\n";

const Extraction = Schema.Struct({ label: Schema.String, facts: Schema.Array(Fact) });

const FACT_GUIDE = `次の種類ごとに、作品を書くときに参照する事実を取り出してください。
- character: 人物そのもの（名前・立場・関係）。subject は人物名。
- voice: 人物の口調・一人称・口癖。body には実際の言い回しの例を入れる。
- event: 出来事。when にはその出来事が作中のいつかを、分かる範囲の言葉で入れる。
- knowledge: ある時点で誰が何を知っている・知らないか。subject は知っている側の人物。
- setting: 舞台・世界の決まり。
- idea: 書き手のまだ使っていない思いつき。
推測で埋めず、資料に書かれていることだけを取り出してください。when が分からなければ null にしてください。`;

const INGEST_SYSTEM = `あなたは二次創作の書き手を手伝う資料係です。渡された文章か URL の中身を読み、作品理解の資料にします。
URL なら WebFetch で読んでください。label には資料の短い名前を付けてください。
${FACT_GUIDE}`;

const MANUSCRIPT_SYSTEM = `あなたは小説の原稿を読む担当編集です。原稿の本文から、書き手が書いた事実を取り出します。
label には「${MANUSCRIPT_LABEL}」を入れてください。
${FACT_GUIDE}`;

/** @internal */
const ingestText = Effect.fn("ingestText")(function* ingestText(text: string) {
  const { label, facts } = yield* judgeAs(Extraction)({
    system: INGEST_SYSTEM,
    prompt: text,
    tools: WEB_TOOLS,
  });
  return yield* addSource({
    label: pipe(label, String.slice(LABEL_START, LABEL_END)),
    origin: "agent",
    client: BUILT_IN_AGENT,
    manuscriptId: NO_MANUSCRIPT,
    facts,
  });
});

/** @internal */
const extractManuscript = Effect.fn("extractManuscript")(function* extractManuscript({
  manuscriptId,
  prose,
}: Readonly<{ manuscriptId: string; prose: readonly string[] }>) {
  if (Array.isReadonlyArrayEmpty(prose)) {
    return;
  }
  const { facts } = yield* judgeAs(Extraction)({
    system: MANUSCRIPT_SYSTEM,
    prompt: pipe(prose, Array.join(LINE_BREAK)),
    tools: NO_TOOLS,
  });
  yield* replaceManuscriptSource({
    label: MANUSCRIPT_LABEL,
    origin: "manuscript",
    client: BUILT_IN_AGENT,
    manuscriptId,
    facts,
  });
});

export { extractManuscript, ingestText };
