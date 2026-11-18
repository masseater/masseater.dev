---
title: "AI時代のリントプリセット"
description: "2026年11月18日時点における、コーディングエージェントが頻繁に利用するショートカットを禁止するリントルールプリセットの調査"
tags: ["静的解析", "ソフトウェア開発", "大規模言語モデル", "2026年のソフトウェア"]
published: true
infobox:
  - label: "調査日"
    value: "2026年11月18日"
  - label: "主なエンジン"
    value: "Oxlint、ESLint、Biome、textlint、Vale"
  - label: "代表例"
    value: "landmines、anti-slop、eslint-plugin-vibe-proof、agnix"
---

AI時代のリントプリセットは、コーディングエージェントがリポジトリの大部分を記述していることを前提としたリントルールセットのことである。人間のチームは、誰も破らないルールを書き留めてこなかった。一方、エージェントはチェックを通過するように最適化するため、ルールを破ることが多い。例えば、エージェントはテスト対象のコードをモックし、パスするまで不安定なテストを再試行する。また、グリーンチェックを得るために `eslint-disable` を追加する。こうしたプリセットは、こうした習慣をリントエラーへと変える。本記事では、2026年11月18日時点で存在するプリセットを列挙する。

こうしたプリセットの多くは、「AIっぽく聞こえる」テキストは探さない。レビュアーが目視で捕捉した安価なショートカットを探す。エージェントがコードの大部分を記述する場合、すべての行を読み込むレビュアーはルールのみとなる。landminesは、エージェントが「グリーンチェック向けに最適化する」[^landmines]と述べている。eslint-plugin-vibe-proofは、コンテキストが圧縮された後にエージェントがスキルを忘れてしまうと指摘する。同プラグインは、決定論的なリンターこそが残るフィードバックループであると主張している[^vibe-proof]。agent-slop-lintは、古いデフォルト設定は1日100行程度を書く人間を前提としているとしている[^agent-slop-lint]。

## 共通の特徴

エラーメッセージは、エージェントに問題の解決方法を伝える。landmines、enforced-architecture、@shadcn/lintはいずれもこのような形式でメッセージを記述する[^landmines][^enforced-architecture][^shadcn-lint]。これにより、エージェントは他のファイルを読まずに問題を修正できる。

多くのプリセットは既存の違反を許容するが、その数は減らす方向にしか動かせない。landminesは、ファイルごとに許容される違反数を正確にカウントする[^landmines]。カウント数よりも違反数が少ないファイルを報告するため、リストは縮小されるのみとなる。agent-lintはリポジトリにベースラインファイルを保持し、`agent-lint ratchet`コマンドはそれを厳格化するのみである[^agent-lint]。

プリセットでは、ルールをバイパスする方法も禁止されている。eslint-plugin-vibe-proof は、理由のない `eslint-disable` コメントを禁止する[^vibe-proof]。Suppress Ratchet は、プルリクエストによって追加される抑制コメントをカウントする[^suppress-ratchet]。

一部のプリセットは、パッケージとしてではなくコピー用のコードとして提供される。anti-slopにはnpmパッケージ[^anti-slop]が存在しない。ユーザーはエージェントスキルを用いて、そのルールをリポジトリにコピーする。enforced-architectureは、エージェントが読み取り、別のスタックに適応させるカタログである[^enforced-architecture]。

ほとんどの新規プリセットはOxlintで動作する。そのうちのいくつかは、ESLint、Oxlint、rslintでも変更なく動作する[^no-comment-slop][^ai-guard]。

## コード

以下の表にコードプリセットを記載する。星の数は2026年11月18日時点のものである。

| プリセット                                                                                 | エンジン                    | ルール数    | ライセンス | 作成日     | スター |
| ------------------------------------------------------------------------------------------ | --------------------------- | ----------- | ---------- | ---------- | ------ |
| [landmines](https://github.com/interfere-inc/landmines)                                    | Oxlint                      | 10          | MIT        | 2026-10-28 | 277    |
| [eslint-plugin-ai-guard](https://github.com/ai-guard-dev/eslint-plugin-ai-guard)           | ESLint, Oxlint              | 27          | MIT        | 2026-04-08 | 20     |
| [agent-lint](https://github.com/MartinCastroAlvarez/agent-lint)                            | ruff, mypy, ESLint, semgrep | AL201-AL302 | MIT        | 2026-10-23 | 0      |
| [Suppress Ratchet](https://github.com/motchalini-llc/suppress-ratchet)                     | GitHub Actions              | -           | -          | -          | -      |
| [anti-slop](https://github.com/dmmulroy/anti-slop)                                         | Oxlint                      | 18 + 5      | MIT        | 2026-08-12 | 6,159  |
| [biome-anti-slop](https://github.com/arberbr/biome-anti-slop)                              | Biome                       | 18 + 5      | MIT        | 2026-11-02 | 0      |
| [oxlint-anti-slop](https://github.com/emilioSp/oxlint-anti-slop)                           | Oxlint                      | 11          | MIT        | 2026-09-30 | 1      |
| [oxc-config-ai-guardrails](https://github.com/matteoantoci/oxc-config-ai-guardrails)       | Oxlint                      | 59 + 16 + 4 | MIT        | 2026-07-31 | 0      |
| [eslint-plugin-vibe-proof](https://github.com/SukkaW/eslint-plugin-vibe-proof)             | ESLint                      | -           | MIT        | 2026-07-26 | 15     |
| [eslint-plugin-llm-core](https://github.com/pertrai1/eslint-plugin-llm-core)               | ESLint                      | -           | MIT        | 2026-04-01 | 14     |
| [eslint-plugin-no-comment-slop](https://github.com/jantimon/eslint-plugin-no-comment-slop) | ESLint, Oxlint, rslint      | 12          | MIT        | 2026-07-30 | 13     |
| [windbag](https://github.com/scale-venture-partners/windbag)                               | CLI                         | 6           | MIT        | 2026-08-05 | 26     |
| [enforced-architecture](https://github.com/GLips/enforced-architecture)                    | Oxlint                      | 67          | -          | 2026-02-19 | 11     |
| [agent-slop-lint](https://github.com/JordanGunn/agent-slop-lint)                           | CLI                         | 25          | Apache-2.0 | 2026-04-11 | 44     |
| [KarpeSlop](https://github.com/CodeDeficient/KarpeSlop)                                    | CLI                         | -           | MIT        | 2025-11-29 | 39     |
| [oxlint-plugin-complexity](https://github.com/itaymendel/oxlint-plugin-complexity)         | Oxlint                      | 1           | MIT        | 2025-12-25 | 52     |
| [@shadcn/lint](https://github.com/shadcn-ui/lint)                                          | ESLint, Oxlint              | -           | MIT        | 2026-09-02 | 3,368  |
| [renderlint](https://github.com/ngocanhnckh/renderlint)                                    | CLI                         | -           | MIT        | 2026-10-25 | 639    |

### テスト

landminesは、Interfere[^landmines]が提供するOxlintプラグイン群である。そのテスト用プラグインは、`no-test-doubles` でテスト対象コードのモックを禁止する。また、`no-fixed-sleep` で固定時間のスリープを禁止する。`no-flake-masking` は、テストの再試行やタイムアウトの引き上げを禁止する。`strict-msw` は、ハンドラがカバーしていないリクエストに対してMSWが失敗することを要求する。その他のプラグインは、散文のコメントを禁止し、テストファイル名とその配置に関するルールを設定する。Oxlint 1.81以降が必要である。一部のユーザーからは、`no-test-doubles` が外部サービスのフェイクも禁止しているとの報告がある[^landmines-adoption]。

eslint-plugin-ai-guard には、4つのプリセットに27個の ESLint ルールが用意されている[^ai-guard]。その CLI コマンド `ai-guard integrity` は、チェックを弱める変更を検出する。具体例としては、新規抑制、テストのスキップ、カバレッジ設定の引き下げなどが挙げられる。また、存在しない npm パッケージ名や、タイポスクワッティングと思われるものをブロックする。CI では、27個のルールすべてが Oxlint で同一の結果を示すことが確認されている。

agent-lint は、プロジェクトですでに使用されているリンターを実行する[^agent-lint]。その結果をベースラインと比較し、新しい指摘があれば失敗する。また、変更内容を git ベースと比較する。追加された抑制、スキップされたテスト、削除されたテスト、およびアサーションが削除されたテストを報告する。さらに、緩和されたリンター設定も報告する。

Ratchet ファミリーは、依存関係のない 3 つの GitHub Actions である[^suppress-ratchet]。Type Ratchet は新しい `any` 型をブロックする。Test Ratchet は `it.skip` と `.only` をブロックする。Suppress Ratchet は新しい `eslint-disable` と `biome-ignore` コメントをブロックする。

### 型

anti-slopは、Dillon Mulroy[^anti-slop]によるOxlintルールのセットである。このルールは、根拠のない型アサーションを却下する。また、関数コントラクトにおける`unknown`および`object`も却下する。Effectコードにはさらに5つのルールが適用される。これらでは、手動での`_tag`チェックではなく、`Match`およびタグ付きコンストラクタが必要となる。biome-anti-slopは、同じルールをBiomeプラグインに移植している[^biome-anti-slop]。その作者は、BiomeプラグインAPIがパッチリリースで変わる可能性があると警告している。oxlint-anti-slopは、同様の目的を持つ11個のOxlintルールからなる別のセットである[^oxlint-anti-slop]。

oxc-config-ai-guardrails は独自のルールを追加しない[^ai-guardrails]。Oxlint が既に備えているルールに基づき、厳格な制限を設ける。ファイルは 200 行まで、関数は 50 行まで記述できる。関数は 3 つのパラメータを指定でき、ブロックは 1 階層までしかネストできない。

### 慣用句とコメント

eslint-plugin-vibe-proof は、エージェントが繰り返す低速または長いイディオムを対象とする[^vibe-proof]。一例として、`.filter()` の呼び出しに続いて `.map()` を呼び出すケースが挙げられる。別の例としては、呼び出しのたびに生成される正規表現がある。4つのプリセットは重複しないため、ユーザーはこれらを組み合わせることができる。eslint-plugin-llm-core は、エージェントにルールのガイダンスを提供するMCPサーバーを追加する[^llm-core]。

eslint-plugin-no-comment-slop には、コメントに関する12のルールがある[^no-comment-slop]。`no-jargon`は「robust」や「seamlessly」といった単語をフラグ付けする。`no-banner-comment`は装飾的な区切り線をフラグ付けする。windbag は Rust で書かれたプリコミット リンターである[^windbag]。現在のコードではなく、変更内容を記述するコメントをフラグ付けする。そのルールは、チケット番号、過去の挙動、およびヘッジワードを検出する。

### 構造

enforced-architectureは、11のカテゴリからなるルールのカタログである[^enforced-architecture]。主要なカテゴリは、境界、型、配置である。TanStack Start、Drizzle、Oxlintを対象としている。そのREADMEでは、エージェントに他のスタック向けのルールを書き直すよう求めている。

agent-slop-lintは、25種類のルール[^agent-slop-lint]を用いて多くの言語のコードをチェックする。これらのルールは、複雑度、重複、およびマジックナンバーを測定する。また、クラス名と重複する名前を検出するものもある。KarpeSlopは、TypeScriptコードにノイズ、嘘、魂という3つの軸でスコアを付与する[^karpeslop]。npmレジストリとインポートを照合し、存在しないパッケージを検出する。oxlint-plugin-complexityは、Oxlintにサイクロマティック複雑度と認知的複雑度を追加する[^complexity]。

### ユーザーインターフェース

@shadcn/lint は、Tailwind のデザインシステムにおけるコンポーネントのスタイルを確認する[^shadcn-lint]。ユーザーは、各コンポーネントがどのクラスを受け付けるかを指定する。すると、エラーメッセージがユーザー自身のコンポーネントのサイズやバリアントを提案する。renderlint は、ブラウザで各ページを複数の幅で開く[^renderlint]。切り詰められたテキスト、低コントラスト、および要素の重なりを報告する。

## 文章とMarkdown

| プリセット                                                                                        | エンジン | 言語 | ライセンス | 作成日     | スター |
| ------------------------------------------------------------------------------------------------- | -------- | ---- | ---------- | ---------- | ------ |
| [textlint-rule-preset-ai-writing](https://github.com/textlint-ja/textlint-rule-preset-ai-writing) | textlint | ja   | MIT        | 2025-06-16 | 1,164  |
| [textlint-rule-preset-ai-words-ja](https://github.com/p1ass/textlint-rule-preset-ai-words-ja)     | textlint | ja   | MIT        | 2026-09-12 | 131    |
| [slopless](https://github.com/berelevant-ai/slopless)                                             | textlint | en   | MIT        | 2026-05-16 | 342    |
| [vale-llm-slop](https://github.com/Syntaf/vale-llm-slop)                                          | Vale     | en   | -          | 2026-07-31 | 31     |
| [seiso](https://github.com/scarletkc/seiso)                                                       | CLI      | -    | MIT        | 2026-09-27 | 196    |

textlint-rule-preset-ai-writingは、AI[^ai-writing]が生成した日本語テキストに共通する構造を検出する。例として、太字のリスト見出しやコロンなどが挙げられる。そのルールは、文言ではなく構造を制限することにある。textlint-rule-preset-ai-words-jaは、こうしたテキストに共通する単語を形態素解析[^ai-words-ja]によって検出する。その多くは、英語から単語単位で翻訳された動詞である。

sloplessは英語のMarkdownをチェックする[^slopless]。そのルールは「let me be honest」や「at the end of the day」といった表現を検出する。vale-llm-slopには2種類のValeスタイル[^vale-llm-slop]がある。`Slop`はバズワードや空虚な賛辞を阻止する。`STE`は、シンプルな技術英語向けのASD-STE100規格に基づいたルールを適用する。

seisoは、リポジトリ内のMarkdownドキュメントに関する1つの規約を定めている[^seiso]。各ドキュメントは、ハウツーやリファレンスなど、1つの種類を宣言する。各ファクトには1つのホームがある。長く残るページでは、バージョンなど頻繁に変わる値を記録してはならない。

## エージェントの設定

| プリセット                                                 | 対象                                       | ライセンス      | 作成日     | スター |
| ---------------------------------------------------------- | ------------------------------------------ | --------------- | ---------- | ------ |
| [agnix](https://github.com/agent-sh/agnix)                 | CLAUDE.md, AGENTS.md, SKILL.md, hooks, MCP | MIT, Apache-2.0 | 2026-01-30 | 487    |
| [ctxlint](https://github.com/YawLabs/ctxlint)              | CLAUDE.md, AGENTS.md, MCP                  | MIT             | 2026-04-05 | 12     |
| [driftlint](https://github.com/alifurkangokce/driftlint)   | CLAUDE.md, AGENTS.md, SKILL.md             | MIT             | 2026-08-11 | 61     |
| [agents-lint](https://github.com/giacomo/agents-lint)      | CLAUDE.md, AGENTS.md, MEMORY.md            | -               | 2026-02-27 | 16     |
| [skill-check](https://github.com/thedaviddias/skill-check) | SKILL.md                                   | MIT             | 2026-02-20 | 194    |
| [LintLang](https://github.com/hermes-labs-ai/lintlang)     | MCP                                        | Apache-2.0      | 2026-02-28 | 147    |

agnixは、エージェント設定用のリンターおよび言語サーバーである[^agnix]。ctxlint、driftlint、agents-lintは、コードと照合してコンテキストファイルをチェックする[^ctxlint][^driftlint][^agents-lint]。これらは、既に存在しないパスや動作しなくなったコマンドを報告する。また、ctxlintはファイルが使用するトークン数もカウントする。skill-checkは、各`SKILL.md`ファイルに0から100までのスコアを付与する[^skill-check]。LintLangは、ツールの説明やシステムプロンプトをチェックする[^lintlang]。例えば、説明がモデルにどちらを使用すべきか指示していない2つのツールを報告する。

## リントルールに該当しない関連プロジェクト

「AI slop」に対抗する有名なプロジェクトの一部は、エージェントスキルやプロンプトである。stop-ai-slopは、エージェントにコードやドキュメントからスロップを除去させるスキルである[^stop-ai-slop]。同スキルはリンターのパートナーを自称している。stop-slopとno-ai-slopは散文向けのスキルで、スター数はそれぞれ19,031件と13,601件である。これらのスキルはモデル内で動作するため、実行ごとに結果は変わりうる。

alintはESLintに似ているが、言語モデルがルールを実行する[^alint]。UltraciteはOxlint、Biome、ESLint向けのプリセットで、設定不要である[^ultracite]。エージェント開発用のリンターとして位置づけられている。

## 2026年の動向

これらのプロジェクトの多くは新規である。上記のプロジェクトの3分の1以上は、2026年8月以降に作成された。landmines、renderlint、agent-lint、biome-anti-slopは10月と11月に登場した。Oxlint用のJSプラグインにより、Rustなしでルールを安価に公開できるようになった。

ルールは現在、文言だけでなくエビデンスもチェックする。文章のルールには、依然として「delve」などの単語が記載されている。コードルールは、テストが実際のコードを実行するかどうかを確認する。型アサーションに理由があるかどうかを確認する。設定ルールは、コンテキストファイルがコードと一致するかどうかを確認する。これらのチェックはいずれもモデルを必要としないため、あらゆる編集時に実行できる。

## masseater.dev での利用

masseater.dev は msch を通じてチェックを行う。独自のリンターには、Markdown 用の y8、構造化用の wism、GitHub Actions 用の fu4、シークレット用の h56m がある。上記のアイデアの一部はすでに網羅されている。msch はコードコメントを禁止しており、y8 は agnix を組み込みプラグインとして動作させている。

mschは、landminesのテストルールやanti-slopの型ルールを採用できる。また、eslint-plugin-vibe-proofがそうしているように、理由のない抑制コメントも禁止できる。プルリクエストがリントやテスト設定を緩めていないかを確認するチェックもmschに適している。ai-guardやagent-lintにはそのようなチェック機能が備わっている。

wism-presetsは、テストファイルの名前や場所に関するlandminesのルールを取り込むことができる。y8-presetsは、ctxlintやdriftlintと同様に、`AGENTS.md`内のパスやコマンドが存在するかを確認できる。また、各ファクトに1つのホームが存在するというseisoルールも取り込める。独自の日本語textlintプリセットでは、textlint-rule-preset-ai-writingの構造ルールを取り込むことができる。fu4-presetsは、ワークフローの変更によってリントやテストステップが削除されないかを確認できる。

## 関連記事

- [Oxlint](/sloppedia/oxlint)
- [fallow](/sloppedia/fallow)
- [モジュール境界ツール](/sloppedia/module-boundary-tools)
- [AIスロップ](/sloppedia/ai-slop)

[^landmines]: interfere-inc, "[landmines](https://github.com/interfere-inc/landmines)". 2026年11月18日閲覧。[^landmines-adoption]: K-Mistele, "[feat: enable four @interfere/landmines testing rules](https://github.com/K-Mistele/anti-slop/pull/9)". 2026年11月18日閲覧。[^vibe-proof]: SukkaW, "[eslint-plugin-vibe-proof](https://github.com/SukkaW/eslint-plugin-vibe-proof)". 2026年11月18日閲覧。[^agent-slop-lint]: JordanGunn, "[agent-slop-lint](https://github.com/JordanGunn/agent-slop-lint)". 2026年11月18日閲覧。[^enforced-architecture]: GLips, "[enforced-architecture](https://github.com/GLips/enforced-architecture)". 2026年11月18日閲覧。[^shadcn-lint]: shadcn-ui, "[@shadcn/lint](https://github.com/shadcn-ui/lint)". 2026年11月18日閲覧。[^agent-lint]: MartinCastroAlvarez, "[agent-lint](https://github.com/MartinCastroAlvarez/agent-lint)". 2026年11月18日閲覧。[^suppress-ratchet]: motchalini-llc, "[Suppress Ratchet](https://github.com/motchalini-llc/suppress-ratchet)". 2026年11月18日閲覧。[^anti-slop]: dmmulroy, "[anti-slop](https://github.com/dmmulroy/anti-slop)". 2026年11月18日閲覧。[^no-comment-slop]: jantimon, "[eslint-plugin-no-comment-slop](https://github.com/jantimon/eslint-plugin-no-comment-slop)". 2026年11月18日閲覧。[^ai-guard]: ai-guard-dev, "[eslint-plugin-ai-guard](https://github.com/ai-guard-dev/eslint-plugin-ai-guard)". 2026年11月18日閲覧。[^biome-anti-slop]: arberbr, "[biome-anti-slop](https://github.com/arberbr/biome-anti-slop)". 2026年11月18日閲覧。[^oxlint-anti-slop]: emilioSp, "[oxlint-anti-slop](https://github.com/emilioSp/oxlint-anti-slop)". 2026年11月18日閲覧。[^ai-guardrails]: matteoantoci, "[oxc-config-ai-guardrails](https://github.com/matteoantoci/oxc-config-ai-guardrails)". 2026年11月18日閲覧。[^llm-core]: pertrai1, "[eslint-plugin-llm-core](https://github.com/pertrai1/eslint-plugin-llm-core)". 2026年11月18日閲覧。[^windbag]: scale-venture-partners, "[windbag](https://github.com/scale-venture-partners/windbag)". 2026年11月18日閲覧。[^karpeslop]: CodeDeficient, "[KarpeSlop](https://github.com/CodeDeficient/KarpeSlop)". 2026年11月18日閲覧。[^complexity]: itaymendel, "[oxlint-plugin-complexity](https://github.com/itaymendel/oxlint-plugin-complexity)". 2026年11月18日閲覧。[^renderlint]: ngocanhnckh, "[renderlint](https://github.com/ngocanhnckh/renderlint)". 2026年11月18日閲覧。[^ai-writing]: textlint-ja, "[textlint-rule-preset-ai-writing](https://github.com/textlint-ja/textlint-rule-preset-ai-writing)". 2026年11月18日閲覧。[^ai-words-ja]: p1ass, "[textlint-rule-preset-ai-words-ja](https://github.com/p1ass/textlint-rule-preset-ai-words-ja)". 2026年11月18日閲覧。[^slopless]: berelevant-ai, "[slopless](https://github.com/berelevant-ai/slopless)". 2026年11月18日閲覧。[^vale-llm-slop]: Syntaf, "[vale-llm-slop](https://github.com/Syntaf/vale-llm-slop)". 2026年11月18日閲覧。[^seiso]: scarletkc, "[seiso](https://github.com/scarletkc/seiso)". 2026年11月18日閲覧。[^agnix]: agent-sh, "[agnix](https://github.com/agent-sh/agnix)". 2026年11月18日閲覧。[^ctxlint]: YawLabs, "[ctxlint](https://github.com/YawLabs/ctxlint)". 2026年11月18日閲覧。[^driftlint]: alifurkangokce, "[driftlint](https://github.com/alifurkangokce/driftlint)". 2026年11月18日閲覧。[^agents-lint]: giacomo, "[agents-lint](https://github.com/giacomo/agents-lint)". 2026年11月18日閲覧。[^skill-check]: thedaviddias, "[skill-check](https://github.com/thedaviddias/skill-check)". 2026年11月18日閲覧。[^lintlang]: hermes-labs-ai, "[LintLang](https://github.com/hermes-labs-ai/lintlang)". 2026年11月18日閲覧。[^stop-ai-slop]: kirankunapuli, "[stop-ai-slop](https://github.com/kirankunapuli/stop-ai-slop)". 2026年11月18日閲覧。[^alint]: alint-dev, "[alint](https://github.com/alint-dev/alint)". 2026年11月18日閲覧。[^ultracite]: Ultracite, "[Ultracite](https://www.ultracite.ai/)". 2026年11月18日閲覧。
