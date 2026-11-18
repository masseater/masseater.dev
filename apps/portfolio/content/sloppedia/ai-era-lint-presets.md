---
title: 「AI時代のリントプリセット」 description: 「2026年11月18日時点で、コーディングエージェントが頻繁に使用するショートカットを禁止する、約230種類のリントルールセットおよびチェッカーのカタログ」 tags: ["静的解析", "ソフトウェア開発", "大規模言語モデル", "2026年のソフトウェア"] published: true infobox:
  - ラベル: 「調査対象」 値: 「2026年11月18日」
  - ラベル: "Entries" 値: "About 230"
  - label: "Main engines" value: "Oxlint, ESLint, Biome, textlint, Vale"
---

AI時代のリントプリセットとは、コーディングエージェントがリポジトリの大部分を記述していることを前提としたリントルールセットのことである。人間のチームは、誰もルールを破らないため、ルールを書き留めることはない。一方、エージェントはチェックを通過するように最適化するため、ルールを破ることが多い。例えば、エージェントはテスト対象のコードをモックし、パスするまで不安定なテストを再試行する。また、グリーンチェックを得るために `eslint-disable` を追加する。こうしたプリセットは、こうした習慣をリントエラーへと変える。本記事では、2026年11月18日時点で存在するプリセットを列挙する。

こうしたプリセットの多くは、「AIっぽく聞こえる」テキストは探さない。レビュアーが目視で捕捉した安価なショートカットを探す。エージェントがコードの大部分を記述する場合、すべての行を読み込むレビュアーはルールのみとなる。landminesは、エージェントが「グリーンチェック向けに最適化する」[^landmines]と述べている。eslint-plugin-vibe-proofは、コンテキストが圧縮された後にエージェントがスキルを忘れてしまうと指摘する。同プラグインは、決定論的なリンターこそが[^vibe-proof]に残るフィードバックループであると主張している。agent-slop-lintは、古いデフォルト設定は1日100行ほど書く人間を前提としているとしている[^agent-slop-lint]。

## 方法

本調査では、2026年11月18日にGitHubリポジトリおよびnpmレジストリを検索した。GitHub検索では、「slop lint」、「agentic linter」、「agents.md linter」などのクエリを約40件使用した。2025年1月以降に作成されたリポジトリのうち、星5以上の評価を得ているものを対象とした。npm検索では、`oxlint-plugin`、`ai-slop`、`textlint-rule-preset`などのキーワードを用い、約30件のクエリを使用した。これら2つの検索により、約800件の候補が得られた。

カタログには、コード、テキスト、または設定を固定ルールでチェックするツールが収録されている。モデルに改善を促すだけのエージェントのスキルやプロンプトは除外されている。また、モデルがテキストを記述したかどうかを推測する検出器も除外されている。ルールをモデルに適用するツールは、別のセクションに記載されている。スター数と週次のnpmダウンロード数は、2026年11月18日時点の値である。ハイフンは、値が不明であることを示す。

カタログには約230件のエントリがある。そのうち約200件が以下の表に記載されている。約25件はアンチスロップのコピーまたはバンドルであり、7件はルールをモデルに適用している。

## 共通の特徴

エラーメッセージは、エージェントに問題の解決方法を伝える。landmines、enforced-architecture、@shadcn/lintはいずれもこのような形式でメッセージを記述する[^landmines][^enforced-architecture][^shadcn-lint]。これにより、エージェントは他のファイルを読まずに問題を修正できる。

多くのプリセットでは既存の違反を許容するが、その数を減少させるのみである。landminesはファイルごとに許容される違反数を正確にカウントする[^landmines]。agent-lintはリポジトリにベースラインファイルを保持し、その`ratchet`コマンドは単にそのファイルを厳格化する[^agent-lint]。

プリセットではルールの回避も禁止されている。eslint-plugin-vibe-proof は、理由のない `eslint-disable` コメントを禁止している[^vibe-proof]。Suppress Ratchet は、プルリクエストによって追加された抑制コメントをカウントする[^suppress-ratchet]。

一部のプリセットは、パッケージ形式ではなくコピー用のコードとして提供されている。anti-slopには独自のnpmパッケージがない[^anti-slop]。ユーザーはエージェントスキルを用いて、そのルールをリポジトリにコピーする。

## テストおよび弱化チェック

これらのツールは、コードを修正せずにエージェントがチェックパスをパスするのを阻止する。landminesは、テスト対象コードのモック、修正されたスリープ、およびテストの再試行を禁止する[^landmines]。その他のツールは、変更内容をベースと比較する。削除されたテスト、除去されたアサーション、新しい抑制コメント、および緩和された設定を報告する。agent-lintとRatchetアクションは、このように動作する[^agent-lint][^suppress-ratchet]。

| Name                                                                             | Engine         | Created    | License    | Stars | Weekly npm downloads |
| -------------------------------------------------------------------------------- | -------------- | ---------- | ---------- | ----- | -------------------- |
| [landmines](https://github.com/interfere-inc/landmines)                          | Oxlint         | 2026-10-28 | MIT        | 311   | -                    |
| [procoder](https://github.com/azrtydxb/procoder)                                 | CLI            | 2026-08-16 | Apache-2.0 | 212   | -                    |
| [repopilot](https://github.com/MykytaStel/repopilot)                             | CLI            | 2026-05-01 | Apache-2.0 | 24    | -                    |
| [eslint-plugin-ai-guard](https://github.com/ai-guard-dev/eslint-plugin-ai-guard) | ESLint, Oxlint | 2026-04-08 | MIT        | 20    | -                    |
| [slopbrake](https://github.com/GreyforgeLabs/slopbrake)                          | CLI            | 2026-09-26 | MIT        | 14    | -                    |
| [deployproof](https://github.com/SVSPraveen/deployproof)                         | CLI            | 2026-08-27 | MIT        | 13    | -                    |
| [red-green-mode](https://github.com/hidevinliu/red-green-mode)                   | CLI            | 2026-08-01 | MIT        | 11    | -                    |
| [agent-roast](https://github.com/Nari-Ab/agent-roast)                            | CLI            | 2026-10-04 | MIT        | 11    | -                    |
| [dxkit](https://github.com/vyuh-labs/dxkit)                                      | CLI            | 2026-04-06 | MIT        | 10    | -                    |
| [ward-ai](https://github.com/RicardoRB/ward-ai)                                  | CLI            | 2026-10-08 | Apache-2.0 | 10    | -                    |
| [hadome](https://github.com/rerorets/hadome)                                     | CLI            | 2026-11-03 | MIT        | 5     | -                    |
| [Synapse-Hub](https://github.com/TeeVee98/Synapse-Hub)                           | CLI            | 2026-10-29 | -          | 2     | -                    |
| [slopsieve](https://github.com/princejain756/slopsieve)                          | CLI            | 2026-10-15 | MIT        | 0     | 36                   |
| [diffslop](https://github.com/AdilSiddiquiHQ/diffslop)                           | CLI            | 2026-10-29 | MIT        | 0     | 35                   |
| [agent-lint](https://github.com/MartinCastroAlvarez/agent-lint)                  | CLI            | 2026-10-23 | MIT        | 0     | -                    |
| [suppress-ratchet](https://github.com/motchalini-llc/suppress-ratchet)           | GitHub Actions | 2026-07-01 | MIT        | 0     | -                    |

## 種類と根拠

anti-slopは、Dillon Mulroy[^anti-slop]によるOxlintルールのセットである。このルールは、根拠のない型アサーションを却下する。また、関数コントラクトにおける`unknown`や`object`も却下する。このグループに属する他のプロジェクトでは、これらのルールをBiome、ESLint、またはPythonに移植している。中にはEffect用のルールを追加するものもある。

| Name                                                                                      | Engine         | Created    | License | Stars | Weekly npm downloads |
| ----------------------------------------------------------------------------------------- | -------------- | ---------- | ------- | ----- | -------------------- |
| [anti-slop](https://github.com/dmmulroy/anti-slop)                                        | Oxlint         | 2026-08-12 | MIT     | 6,164 | -                    |
| [ai-deslop](https://github.com/maharshi365/deslop)                                        | Oxlint         | 2026-09-13 | -       | 72    | 13,223               |
| [anti-slop-py](https://github.com/TinyFrontier/anti-slop-py)                              | Python         | 2026-08-23 | MIT     | 10    | -                    |
| [anti-slop-py](https://github.com/infoslack/anti-slop-py)                                 | Python         | 2026-08-22 | MIT     | 7     | -                    |
| [oxslop](https://github.com/Romariin/oxslop)                                              | Oxlint         | 2026-09-22 | -       | 2     | 495                  |
| [oxlint-plugin-solzero](https://github.com/SolZeroAI/oxlint-plugin-solzero)               | Oxlint         | 2026-10-27 | MIT     | 1     | 732                  |
| [@jliocsar/begone-slop](https://github.com/jliocsar/begone-slop)                          | Oxlint         | 2026-08-13 | -       | 1     | 409                  |
| [oxlint-anti-slop](https://github.com/emilioSp/oxlint-anti-slop)                          | Oxlint         | 2026-09-30 | MIT     | 1     | -                    |
| [@aranlucas/oxforge](https://github.com/aranlucas/oxforge)                                | Oxlint         | 2026-10-13 | MIT     | 0     | 528                  |
| [@yousufrasheed/eslint-plugin-antislop](https://github.com/YousufRasheed/eslint-antislop) | ESLint         | 2026-08-18 | MIT     | 0     | 268                  |
| [biome-anti-slop](https://github.com/arberbr/biome-anti-slop)                             | Biome          | 2026-11-02 | MIT     | 0     | -                    |
| [@seanmozeik/de-clank](https://www.npmjs.com/package/@seanmozeik/de-clank)                | Oxlint         | -          | -       | -     | 4,095                |
| [@byarcadia-app/anti-slop](https://www.npmjs.com/package/@byarcadia-app/anti-slop)        | Oxlint         | -          | -       | -     | 755                  |
| [biome-anti-slop](https://www.npmjs.com/package/biome-anti-slop)                          | Biome          | -          | -       | -     | 595                  |
| [@spacemansh/anti-slop](https://www.npmjs.com/package/@spacemansh/anti-slop)              | ESLint, Oxlint | -          | -       | -     | 65                   |
| [biome-plugin-anti-slop](https://www.npmjs.com/package/biome-plugin-anti-slop)            | Biome          | -          | -       | -     | 10                   |

多くのパッケージがアンチスロップをコピーしたり、共有設定にバンドルしたりしている。以下の表にそれらを名称別に示す。

| Package                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------- |
| [@fisch0920/oxlint-plugin-anti-slop](https://www.npmjs.com/package/@fisch0920/oxlint-plugin-anti-slop)           |
| [@kamaal111/oxlint-plugin-anti-slop](https://www.npmjs.com/package/@kamaal111/oxlint-plugin-anti-slop)           |
| [@sha256_nulled/oxlint-plugin-anti-slop](https://www.npmjs.com/package/@sha256_nulled/oxlint-plugin-anti-slop)   |
| [@aranlucas/oxlint-plugin-anti-slop](https://www.npmjs.com/package/@aranlucas/oxlint-plugin-anti-slop)           |
| [@miladk/dmmulroy-anti-slop](https://www.npmjs.com/package/@miladk/dmmulroy-anti-slop)                           |
| [@victor-software-house/anti-slop](https://www.npmjs.com/package/@victor-software-house/anti-slop)               |
| [@iam4x/oxlint-plugin-anti-slop](https://www.npmjs.com/package/@iam4x/oxlint-plugin-anti-slop)                   |
| [@adriandmitroca/oxlint-plugin-anti-slop](https://www.npmjs.com/package/@adriandmitroca/oxlint-plugin-anti-slop) |
| [@sematico/anti-slop](https://www.npmjs.com/package/@sematico/anti-slop)                                         |
| [@buildkitgg/oxlint-plugin-anti-slop](https://www.npmjs.com/package/@buildkitgg/oxlint-plugin-anti-slop)         |
| [antislop-plugin](https://www.npmjs.com/package/antislop-plugin)                                                 |
| [oxlint-plugin-anti-slop](https://www.npmjs.com/package/oxlint-plugin-anti-slop)                                 |
| [@try-works/dsh-anti-slop](https://www.npmjs.com/package/@try-works/dsh-anti-slop)                               |
| [shoemaker-oxlint-plugins](https://www.npmjs.com/package/shoemaker-oxlint-plugins)                               |
| [@propsoch/oxlint-anti-slop-web](https://www.npmjs.com/package/@propsoch/oxlint-anti-slop-web)                   |
| [@antelopejs/tooling-configs](https://www.npmjs.com/package/@antelopejs/tooling-configs)                         |
| [@imapps/oxc-config](https://www.npmjs.com/package/@imapps/oxc-config)                                           |
| [@buildkitgg/oxlint-config](https://www.npmjs.com/package/@buildkitgg/oxlint-config)                             |
| [@saifulapm/oxc-config](https://www.npmjs.com/package/@saifulapm/oxc-config)                                     |
| [@r1-dev/code-style](https://www.npmjs.com/package/@r1-dev/code-style)                                           |
| [@butshouldwe/oxlint-config](https://www.npmjs.com/package/@butshouldwe/oxlint-config)                           |
| [@kiranaide/oxlint-kit](https://www.npmjs.com/package/@kiranaide/oxlint-kit)                                     |
| [@siim-m/config](https://www.npmjs.com/package/@siim-m/config)                                                   |
| [@iimmpact-sdn-bhd/oxlint](https://www.npmjs.com/package/@iimmpact-sdn-bhd/oxlint)                               |
| [@raintree-technology/trellis](https://www.npmjs.com/package/@raintree-technology/trellis)                       |
| [antislop-skillset](https://www.npmjs.com/package/antislop-skillset)                                             |

## 一般的なコードルール

これが最大のグループである。そのルールは一度に多くのパターンを網羅している。例としては、デッドコード、飲み込まれたエラー、`as any` キャスト、残った `console.log` 呼び出し、プレースホルダーボディなどが挙げられる。中には ESLint や Oxlint のプラグインもある。また、リポジトリにスコアを付与する CLI もある。このグループでは、Ultracite と eslint-plugin-no-mistakes の週間ダウンロード数が最も多い。

| Name                                                                                         | Engine                | Created    | License | Stars | Weekly npm downloads |
| -------------------------------------------------------------------------------------------- | --------------------- | ---------- | ------- | ----- | -------------------- |
| [ultracite](https://github.com/haydenbleasel/ultracite)                                      | Oxlint, Biome, ESLint | 2022-03-18 | MIT     | 3,373 | 2,144,134            |
| [aislop](https://github.com/scanaislop/aislop)                                               | CLI                   | 2026-03-06 | MIT     | 749   | 29,564               |
| [eslint-plugin-slop](https://github.com/antfu/eslint-plugin-slop)                            | ESLint                | 2026-09-02 | MIT     | 128   | -                    |
| [vibecop](https://github.com/bhvbhushan/vibecop)                                             | CLI                   | 2026-04-01 | MIT     | 57    | -                    |
| [KarpeSlop](https://github.com/CodeDeficient/KarpeSlop)                                      | CLI                   | 2025-11-29 | MIT     | 39    | -                    |
| [grain](https://github.com/mmartoccia/grain)                                                 | CLI                   | 2026-03-04 | MIT     | 34    | -                    |
| [rigour](https://github.com/rigour-labs/rigour)                                              | CLI                   | 2026-01-04 | MIT     | 29    | -                    |
| [@yuvrajangadsingh/vibecheck](https://github.com/yuvrajangadsingh/vibecheck)                 | ESLint                | 2026-02-26 | -       | 27    | 626                  |
| [slopcheck-deslop](https://github.com/godagoo/slopcheck-deslop)                              | CLI                   | 2026-08-25 | MIT     | 18    | -                    |
| [antislop](https://github.com/skew202/antislop)                                              | CLI                   | 2025-12-31 | -       | 17    | -                    |
| [slop-police](https://github.com/kubk/slop-police)                                           | CLI                   | 2026-10-22 | MIT     | 15    | 2,587                |
| [eslint-plugin-vibe-proof](https://github.com/SukkaW/eslint-plugin-vibe-proof)               | ESLint                | 2026-07-26 | MIT     | 15    | -                    |
| [prodlint](https://github.com/prodlint/prodlint)                                             | CLI                   | 2026-02-16 | MIT     | 15    | -                    |
| [eslint-plugin-llm-core](https://github.com/pertrai1/eslint-plugin-llm-core)                 | ESLint                | 2026-04-01 | MIT     | 14    | -                    |
| [lipstyk](https://github.com/styrene-lab/lipstyk)                                            | CLI                   | 2026-04-25 | MIT     | 13    | -                    |
| [eslint-plugin-no-mistakes](https://github.com/jonathanong/no-mistakes)                      | ESLint, Oxlint        | 2026-05-11 | MIT     | 12    | 114,857              |
| [@sshkeda/check](https://github.com/sshkeda/check)                                           | CLI                   | 2026-10-31 | MIT     | 12    | 2,066                |
| [@geoql/oxlint-plugin-vue-doctor, nuxt-doctor](https://github.com/geoql/doctor)              | Oxlint, ESLint        | 2026-05-28 | MIT     | 7     | 4,237                |
| [eslint-plugin-human-first](https://github.com/olistic/eslint-plugin-human-first)            | ESLint                | 2026-02-13 | -       | 6     | 1,484                |
| [realitygate](https://github.com/usmanmanii/realitygate)                                     | CLI                   | 2026-10-19 | MIT     | 5     | -                    |
| [eslint-plugin-deslop](https://github.com/ahxar/eslint-plugin-deslop)                        | ESLint                | 2026-01-20 | MIT     | 3     | 6,778                |
| [@alexcodeplace/slopgate](https://github.com/alexcodeplace/slopgate)                         | CLI                   | 2026-06-10 | MIT     | 3     | 1,392                |
| [eslint-plugin-ai-guardrails](https://github.com/isaacnewton123/eslint-plugin-ai-guardrails) | ESLint                | 2026-05-06 | MIT     | 3     | 200                  |
| [@sloplint/cli](https://github.com/mattbaconz/sloplint)                                      | CLI                   | 2026-10-15 | MIT     | 3     | 63                   |
| [slopscore](https://github.com/Vinay-O/slopscore)                                            | CLI                   | 2026-06-29 | MIT     | 3     | 63                   |
| [slopmop](https://github.com/zico-io/mop)                                                    | ESLint                | 2026-10-08 | MIT     | 1     | 2,175                |
| [lintmax](https://github.com/1qh/lintmax)                                                    | CLI                   | 2026-03-06 | -       | 1     | 425                  |
| [eslint-plugin-anti-slop](https://github.com/jakyeamos/eslint-plugin-anti-slop)              | ESLint                | 2026-06-22 | MIT     | 1     | 262                  |
| [eslint-plugin-ai-agent-standards](https://github.com/vlkalex/ai-agent-coding-standards)     | ESLint                | 2026-05-29 | MIT     | 1     | 141                  |
| [stopslop](https://github.com/BaryshevRS/stopslop)                                           | CLI                   | 2026-07-13 | MIT     | 1     | 61                   |
| [@rocharm/tsaudit](https://github.com/r0charm/tsaudit)                                       | Oxlint                | 2026-11-07 | MIT     | 0     | 675                  |
| [ts-slop](https://github.com/AugurCognito/ts_slop)                                           | ESLint                | 2026-07-06 | MIT     | 0     | 579                  |
| [sloplint-cli](https://github.com/Talha-2/sloplint)                                          | CLI                   | 2026-11-12 | MIT     | 0     | 293                  |
| [@slop-lab/qg](https://github.com/slop-lab/quality-gate)                                     | CLI                   | 2026-07-04 | MIT     | 0     | 51                   |
| [oxc-config-ai-guardrails](https://github.com/matteoantoci/oxc-config-ai-guardrails)         | Oxlint                | 2026-07-31 | MIT     | 0     | -                    |
| [oxlint-better](https://www.npmjs.com/package/oxlint-better)                                 | Oxlint                | -          | -       | -     | 1,252                |
| [unslop](https://www.npmjs.com/package/unslop)                                               | CLI                   | -          | -       | -     | 738                  |
| [eslint-plugin-ai-rules](https://www.npmjs.com/package/eslint-plugin-ai-rules)               | ESLint                | -          | -       | -     | 689                  |
| [leancheck](https://www.npmjs.com/package/leancheck)                                         | CLI                   | -          | -       | -     | 55                   |
| [@methiu/raigal](https://www.npmjs.com/package/@methiu/raigal)                               | CLI                   | -          | -       | -     | 48                   |

## その他の言語

一部のルールセットはJavaScript以外の言語を対象としている。ex_slopはElixirのCredoチェックを追加する。sloppyはPHP用の34個のルールを追加する。複数のツールがPythonコードをチェックする。

| Name                                                                 | Engine  | Created    | License    | Stars | Weekly npm downloads |
| -------------------------------------------------------------------- | ------- | ---------- | ---------- | ----- | -------------------- |
| [sloppy](https://github.com/Heyosseus/sloppy)                        | PHPStan | 2026-09-10 | MIT        | 231   | -                    |
| [ex_slop](https://github.com/elixir-vibe/ex_slop)                    | Credo   | 2026-03-07 | MIT        | 176   | -                    |
| [AI-SLOP-Detector](https://github.com/flamehaven01/AI-SLOP-Detector) | Python  | 2026-01-08 | MIT        | 120   | -                    |
| [sloppylint](https://github.com/rsionnach/sloppylint)                | Python  | 2025-12-05 | -          | 91    | -                    |
| [agent-slop-lint](https://github.com/JordanGunn/agent-slop-lint)     | Python  | 2026-04-11 | Apache-2.0 | 44    | -                    |
| [ComposeLintAI](https://github.com/TechsOneAi/ComposeLintAI)         | Kotlin  | 2026-09-24 | Apache-2.0 | 36    | -                    |
| [thai-lint](https://github.com/be-wise-be-kind/thai-lint)            | Python  | 2025-10-07 | MIT        | 25    | -                    |
| [slopcop](https://github.com/cm2435/slopcop)                         | Python  | 2026-04-06 | MIT        | 11    | -                    |

## コメント

これらのツールは、コードの繰り返しや変更内容を説明するコメントにフラグを立てる。eslint-plugin-no-comment-slop には、コメントに関する12のルールがある[^no-comment-slop]。windbag は、コメント内のチケット番号、過去の挙動、およびヘッジワードにフラグを立てる[^windbag]。

| Name                                                                                             | Engine                 | Created    | License    | Stars | Weekly npm downloads |
| ------------------------------------------------------------------------------------------------ | ---------------------- | ---------- | ---------- | ----- | -------------------- |
| [windbag](https://github.com/scale-venture-partners/windbag)                                     | CLI                    | 2026-08-05 | MIT        | 26    | -                    |
| [eslint-plugin-no-comment-slop](https://github.com/jantimon/eslint-plugin-no-comment-slop)       | ESLint, Oxlint, rslint | 2026-07-30 | MIT        | 13    | -                    |
| [stop-ai-slop](https://github.com/WhiteBite/stop-ai-slop)                                        | CLI                    | 2026-09-23 | MIT        | 7     | 269                  |
| [comment-checker](https://github.com/systemfsoftware/comment-checker)                            | Claude Code hook       | 2026-08-12 | Apache-2.0 | 6     | -                    |
| [@dannote/sloplint](https://github.com/dannote/sloplint)                                         | CLI                    | 2026-02-04 | MIT        | 4     | 29                   |
| [@vasilvestre/opencode-comment-checker](https://github.com/vasilvestre/opencode-comment-checker) | OpenCode plugin        | 2026-10-30 | MIT        | 0     | 53                   |

## ハルシネーションが発生したパッケージ

エージェントが存在しないパッケージをインポートすることがある。攻撃者はこのような名前のパッケージを公開できる。この攻撃はスロップスクワッティングと呼ばれる。これらのツールは、インストール前にパッケージ名をレジストリと照合する。

| Name                                                                               | Engine | Created    | License    | Stars | Weekly npm downloads |
| ---------------------------------------------------------------------------------- | ------ | ---------- | ---------- | ----- | -------------------- |
| [open-code-review](https://github.com/raye-deng/open-code-review)                  | CLI    | 2026-03-04 | -          | 41    | -                    |
| [sloppy-joe](https://github.com/brennhill/sloppy-joe)                              | CLI    | 2026-03-21 | Apache-2.0 | 34    | -                    |
| [relais](https://github.com/Paskod121/relais)                                      | CLI    | 2026-10-22 | MIT        | 15    | -                    |
| [slopcheck](https://github.com/mattschaller/slopcheck)                             | CLI    | 2026-03-08 | MIT        | 11    | -                    |
| [dep-hallucinator](https://github.com/serhanwbahar/dep-hallucinator)               | CLI    | 2025-06-18 | MIT        | 9     | -                    |
| [slopspotter](https://github.com/conranpearce/slopspotter)                         | CLI    | 2026-04-25 | MIT        | 6     | -                    |
| [slop-deps](https://github.com/viditx/slop-deps)                                   | CLI    | 2026-10-26 | MIT        | 1     | 344                  |
| [@topaisaas/agentpr-guard](https://www.npmjs.com/package/@topaisaas/agentpr-guard) | CLI    | -          | -          | -     | 17                   |

## 構造とアーキテクチャ

これらのツールは、コードがどこに配置され、他のコードからどのように依存しているかを確認する。enforced-architectureは、11のカテゴリからなるルールのカタログである[^enforced-architecture]。そのREADMEでは、エージェントに他のスタック向けのルールを書き直すよう求めている。

| Name                                                                               | Engine | Created    | License | Stars | Weekly npm downloads |
| ---------------------------------------------------------------------------------- | ------ | ---------- | ------- | ----- | -------------------- |
| [oxlint-plugin-complexity](https://github.com/itaymendel/oxlint-plugin-complexity) | Oxlint | 2025-12-25 | MIT     | 52    | -                    |
| [dictator](https://github.com/seuros/dictator)                                     | CLI    | 2025-12-03 | -       | 28    | -                    |
| [deslop](https://github.com/Ivy-Apps/deslop)                                       | CLI    | 2025-12-14 | MIT     | 19    | -                    |
| [enforced-architecture](https://github.com/GLips/enforced-architecture)            | Oxlint | 2026-02-19 | -       | 11    | -                    |
| [slopbuckets](https://github.com/NicolasCaous/slopbuckets)                         | CLI    | 2026-10-04 | MIT     | 2     | 1,049                |
| [slopbrick](https://github.com/usebrick/platform)                                  | CLI    | 2026-06-26 | MIT     | 1     | 41                   |
| [clonesieve](https://www.npmjs.com/package/clonesieve)                             | CLI    | -          | -       | -     | 357                  |

## ユーザーインターフェース

これらのツールは、UIコードやレンダリングされたページをチェックする。@shadcn/lint は、Tailwindのデザインシステムにおけるコンポーネントのスタイルをチェックする[^shadcn-lint]。renderlint は、ブラウザで各ページを複数の幅で開く[^renderlint]。その他には、紫色のグラデーションなど、生成されたページの視覚的な傾向を調べるものもある。

| Name                                                                   | Engine         | Created    | License    | Stars | Weekly npm downloads |
| ---------------------------------------------------------------------- | -------------- | ---------- | ---------- | ----- | -------------------- |
| [lint](https://github.com/shadcn-ui/lint)                              | ESLint, Oxlint | 2026-09-02 | MIT        | 3,368 | -                    |
| [renderlint](https://github.com/ngocanhnckh/renderlint)                | Browser        | 2026-10-25 | MIT        | 641   | -                    |
| [ui-craft-detect](https://github.com/educlopez/ui-craft)               | CLI            | 2026-03-19 | MIT        | 465   | 678                  |
| [ai-design-check](https://github.com/enmerasoftware/ai-design-check)   | CLI            | 2026-10-28 | MIT        | 252   | -                    |
| [ux-skill](https://github.com/Laith0003/ux-skill)                      | CLI            | 2026-05-24 | MIT        | 105   | -                    |
| [@gessobuild/anti-slop](https://github.com/Gesso-Build/skills)         | CLI            | 2026-07-28 | MIT        | 94    | 131                  |
| [montology](https://github.com/shinyobjectz/montology)                 | CLI            | 2026-08-10 | Apache-2.0 | 61    | -                    |
| [unslop](https://github.com/avivgerz-hue/unslop)                       | CLI            | 2026-11-07 | MIT        | 54    | -                    |
| [slop-detect](https://github.com/ravidsrk/slop-detect)                 | Browser        | 2026-05-26 | MIT        | 21    | 354                  |
| [ui-animation-polish](https://github.com/hasanify/ui-animation-polish) | CLI            | 2026-11-06 | MIT        | 17    | -                    |
| [oversight-lint](https://github.com/rachelslurs/storybook-oversight)   | CLI            | 2026-07-12 | MIT        | 15    | 4,106                |
| [aislopmeter](https://github.com/omergocmen/aislopmeter)               | CLI            | 2026-10-17 | MIT        | 12    | 59                   |
| [pixelslop](https://github.com/gabelul/pixelslop)                      | Browser        | 2026-03-20 | Apache-2.0 | 10    | 41                   |
| [eslint-plugin-agentlint](https://github.com/ratikkoka/agentlint)      | ESLint         | 2026-02-14 | MIT        | 0     | 2,156                |
| [uislop](https://github.com/princejain756/uislop)                      | CLI            | 2026-11-05 | MIT        | 0     | 383                  |
| [squint-test](https://github.com/AbhinavGGarg/Squint)                  | Browser        | 2026-11-02 | -          | 0     | 50                   |

## 日本語の文章

textlint-rule-preset-ai-writing は、AI[^ai-writing] が作成した日本語テキストに共通する構造を検出する。例として、太字のリスト見出しやコロンなどが挙げられる。textlint-rule-preset-ai-words-ja は、こうしたテキストに共通する単語を形態素解析によって検出する[^ai-words-ja]。

| Name                                                                                                | Engine   | Created    | License | Stars | Weekly npm downloads |
| --------------------------------------------------------------------------------------------------- | -------- | ---------- | ------- | ----- | -------------------- |
| [textlint-rule-preset-ai-writing](https://github.com/textlint-ja/textlint-rule-preset-ai-writing)   | textlint | 2025-06-16 | MIT     | 1,164 | -                    |
| [textlint-rule-preset-ai-words-ja](https://github.com/p1ass/textlint-rule-preset-ai-words-ja)       | textlint | 2026-09-12 | MIT     | 131   | -                    |
| [ux-writing-dead-cliche](https://github.com/BoxPistols/ux-writing-dead-cliche)                      | textlint | 2026-08-28 | MIT     | 1     | -                    |
| [textlint-rule-preset-ja-no-ai-slop](https://github.com/kubosho/textlint-rule-preset-ja-no-ai-slop) | textlint | 2026-09-26 | MIT     | 0     | 194                  |

## 英語の文章

これは2番目に規模の大きいグループである。ほとんどのツールは、「delve」のような単語やフレーズのリストに一致する。また、文構造をチェックするものもある。多くはテキストにスコアを付与し、CIで制限値を超えると不合格となる。

| Name                                                                                          | Engine   | Created    | License    | Stars | Weekly npm downloads |
| --------------------------------------------------------------------------------------------- | -------- | ---------- | ---------- | ----- | -------------------- |
| [SlopMonster](https://github.com/ItsssssJack/SlopMonster)                                     | CLI      | 2026-08-29 | MIT        | 1,291 | -                    |
| [sloptrim](https://github.com/seyedehsanhadi/sloptrim)                                        | CLI      | 2026-08-13 | Apache-2.0 | 425   | -                    |
| [slopless](https://github.com/berelevant-ai/slopless)                                         | textlint | 2026-05-16 | MIT        | 342   | -                    |
| [seiso](https://github.com/scarletkc/seiso)                                                   | CLI      | 2026-09-27 | MIT        | 196   | -                    |
| [vale-ai-tells](https://github.com/tbhb/vale-ai-tells)                                        | Vale     | 2025-12-02 | MIT        | 135   | -                    |
| [humanizer-lint](https://github.com/yanstd888/humanizer-lint)                                 | CLI      | 2026-10-30 | MIT        | 119   | -                    |
| [ai-slop-detector](https://github.com/FeedHive/ai-slop-detector)                              | CLI      | 2026-10-12 | MIT        | 111   | -                    |
| [contextlint](https://github.com/nozomi-koborinai/contextlint)                                | CLI      | 2026-03-04 | Apache-2.0 | 47    | -                    |
| [snifftest](https://github.com/DanRWilloughby/snifftest)                                      | CLI      | 2026-09-17 | MIT        | 38    | -                    |
| [vale-llm-slop](https://github.com/Syntaf/vale-llm-slop)                                      | Vale     | 2026-07-31 | -          | 31    | -                    |
| [cadence-deslop](https://github.com/wuisabel-gif/Cadence)                                     | CLI      | 2026-06-19 | MIT        | 29    | 592                  |
| [no-slop](https://github.com/Byk3y/no-slop)                                                   | CLI      | 2026-04-08 | MIT        | 16    | -                    |
| [textlint-rule-preset-ste-ai](https://github.com/Jamie-BitFlight/textlint-rule-preset-ste-ai) | textlint | 2026-07-26 | MIT        | 15    | -                    |
| [simple-english](https://github.com/TonyCTHsu/simple-english)                                 | CLI      | 2026-09-27 | MIT        | 14    | -                    |
| [writehuman](https://github.com/arslanrakh/write-human)                                       | CLI      | 2026-10-02 | MIT        | 13    | 244                  |
| [slopvac](https://github.com/slopvac/slopvac)                                                 | CLI      | 2026-07-27 | Apache-2.0 | 13    | -                    |
| [ai-slop-detect](https://github.com/antydizajn/ai-slop-detect)                                | CLI      | 2026-06-02 | MIT        | 9     | -                    |
| [wsc](https://github.com/theserverlessdev/wsc)                                                | CLI      | 2025-03-06 | MIT        | 9     | -                    |
| [voices](https://github.com/jdkato/voices)                                                    | Vale     | 2026-08-31 | MIT        | 7     | -                    |
| [writinglint](https://github.com/NikhilVerma/writinglint)                                     | CLI      | 2026-07-07 | MIT        | 7     | -                    |
| [ste-lint](https://github.com/johnsaigle/ste-lint)                                            | CLI      | 2026-08-05 | MIT        | 6     | -                    |
| [slophound](https://github.com/JosXa/slophound)                                               | CLI      | 2026-09-05 | MIT        | 6     | -                    |
| [zero-slop](https://github.com/trefeon/zero-slop)                                             | CLI      | 2026-08-18 | MIT        | 6     | -                    |
| [slop-chop-wasm](https://github.com/dcadolph/slop-chop)                                       | CLI      | 2026-06-25 | MIT        | 5     | 95                   |
| [slop](https://github.com/bheijden/slop)                                                      | CLI      | 2026-08-28 | Apache-2.0 | 5     | -                    |
| [plain-english](https://github.com/nordscope-fi/plain-english)                                | CLI      | 2026-08-06 | MIT        | 4     | 169                  |
| [style-doctor](https://github.com/baronunread/style-doctor)                                   | CLI      | 2026-08-28 | MIT        | 1     | 913                  |
| [shibbo](https://github.com/xvr2e7/shibbo)                                                    | CLI      | 2026-11-08 | MIT        | 1     | 531                  |
| [@kcgdz/sloplint](https://github.com/kcgdz/sloplint)                                          | CLI      | 2026-10-31 | MIT        | 1     | 48                   |
| [llm-slop-detector](https://github.com/mandakan/llm-slop-detector)                            | CLI      | 2026-04-23 | MIT        | 1     | 27                   |
| [unslop-ci](https://github.com/cj-vana/unslop-ci)                                             | CLI      | 2026-07-11 | -          | 1     | 12                   |
| [readme-unslop](https://github.com/HiegBr/readme-unslop)                                      | CLI      | 2026-11-01 | MIT        | 0     | 355                  |
| [@alokraj68/plainspoken](https://github.com/alokraj68/craftkit)                               | CLI      | 2026-08-11 | MIT        | 0     | 55                   |
| [@askeleven/bot-tells](https://github.com/askeleven/bot-tells)                                | CLI      | 2026-10-17 | MIT        | 0     | 49                   |
| [sepia-lint](https://github.com/zhaomo08/sepia-lint)                                          | CLI      | 2026-09-02 | MIT        | 0     | 13                   |
| [ai-slop-linter](https://www.npmjs.com/package/ai-slop-linter)                                | CLI      | -          | -          | -     | 104                  |
| [dontreadme-cli](https://www.npmjs.com/package/dontreadme-cli)                                | CLI      | -          | -          | -     | 12                   |

## 他言語の散文

これらのツールは、フランス語、スペイン語、ドイツ語、韓国語、または中国語を対象としている。中には英語もチェックするものがある。

| Name                                                                   | Engine | Created    | License  | Stars | Weekly npm downloads |
| ---------------------------------------------------------------------- | ------ | ---------- | -------- | ----- | -------------------- |
| [zhtw-mcp](https://github.com/sysprog21/zhtw-mcp)                      | CLI    | 2026-03-10 | MIT      | 511   | -                    |
| [llmlint](https://github.com/notnotype/llmlint)                        | CLI    | 2026-06-30 | AGPL-3.0 | 13    | -                    |
| [slopcheck-fr](https://github.com/tns-research/slopcheck-fr)           | CLI    | 2026-10-10 | MIT      | 12    | -                    |
| [slop-radar](https://github.com/renefichtmueller/slop-radar)           | CLI    | 2026-03-19 | MIT      | 10    | 14                   |
| [slop-gate](https://github.com/hwajongpark/slop-gate)                  | CLI    | 2026-05-29 | MIT      | 5     | 42                   |
| [ai-slop-detector](https://github.com/liuxiaobai8868/ai-slop-detector) | CLI    | 2026-06-03 | MIT      | 5     | -                    |
| [@e1i0/human](https://github.com/e1i0r/human)                          | CLI    | 2026-09-15 | -        | 1     | 16                   |
| [slopfix](https://github.com/Zwarmex/slopfix)                          | CLI    | 2026-10-25 | MIT      | 0     | 42                   |
| [buvard](https://www.npmjs.com/package/buvard)                         | CLI    | -          | -        | -     | 736                  |

## エージェントの設定

これらのツールは、エージェントが読み込むファイルをチェックする。agnixは、エージェント設定用のリンターおよび言語サーバーである[^agnix]。ctxlint、driftlint、agents-lintは、コードに対してコンテキストファイルをチェックする[^ctxlint][^driftlint][^agents-lint]。これらは、存在しなくなったパスや動作しなくなったコマンドを報告する。他にも多くのツールが、`SKILL.md`ファイルのみをチェックする。

| Name                                                                           | Engine   | Created    | License    | Stars | Weekly npm downloads |
| ------------------------------------------------------------------------------ | -------- | ---------- | ---------- | ----- | -------------------- |
| [agnix](https://github.com/agent-sh/agnix)                                     | CLI, LSP | 2026-01-30 | Apache-2.0 | 487   | -                    |
| [skill-check](https://github.com/thedaviddias/skill-check)                     | CLI      | 2026-02-20 | MIT        | 194   | -                    |
| [lintlang](https://github.com/hermes-labs-ai/lintlang)                         | CLI      | 2026-02-28 | Apache-2.0 | 147   | -                    |
| [SkillMD](https://github.com/skillmds/SkillMD)                                 | CLI      | 2026-08-25 | MIT        | 147   | -                    |
| [agentlinter](https://github.com/seojoonkim/agentlinter)                       | CLI      | 2026-02-05 | -          | 83    | -                    |
| [driftlint](https://github.com/alifurkangokce/driftlint)                       | CLI      | 2026-08-11 | MIT        | 61    | -                    |
| [agentskill-kit](https://github.com/Lethe044/agentskill-kit)                   | CLI      | 2026-03-14 | MIT        | 51    | -                    |
| [agents-md-cookbook](https://github.com/Taiizor/agents-md-cookbook)            | CLI      | 2026-06-14 | MIT        | 29    | -                    |
| [doodle](https://github.com/krishyaid-coder/doodle)                            | CLI      | 2026-06-20 | MIT        | 26    | -                    |
| [@carlrannaberg/cclint](https://github.com/carlrannaberg/cclint)               | CLI      | 2025-08-21 | -          | 22    | 3,461                |
| [agents-contract](https://github.com/AntoGA/agents-contract)                   | CLI      | 2026-10-19 | MIT        | 20    | -                    |
| [schliff](https://github.com/Zandereins/schliff)                               | CLI      | 2026-03-19 | MIT        | 18    | -                    |
| [pulser](https://github.com/TheStack-ai/pulser)                                | CLI      | 2026-03-18 | MIT        | 18    | -                    |
| [agents-lint](https://github.com/giacomo/agents-lint)                          | CLI      | 2026-02-27 | -          | 16    | -                    |
| [claudelint](https://github.com/pdugan20/claudelint)                           | CLI      | 2026-02-08 | MIT        | 16    | -                    |
| [skill-lint](https://github.com/himself65/skill-lint)                          | CLI      | 2026-04-01 | MIT        | 16    | -                    |
| [nori-lint](https://github.com/tilework-tech/nori-lint)                        | CLI      | 2026-01-30 | Apache-2.0 | 15    | -                    |
| [agentconfig-doctor](https://github.com/vasikmansuri/agentconfig-doctor)       | CLI      | 2026-10-14 | MIT        | 13    | -                    |
| [ctxlint](https://github.com/YawLabs/ctxlint)                                  | CLI      | 2026-04-05 | MIT        | 12    | -                    |
| [cclint](https://github.com/felixgeelhaar/cclint)                              | CLI      | 2025-07-20 | MIT        | 12    | -                    |
| [cursor-doctor](https://github.com/nedcodes-ok/cursor-doctor)                  | CLI      | 2026-02-17 | MIT        | 10    | -                    |
| [lintai](https://github.com/777genius/lintai)                                  | CLI      | 2026-03-26 | -          | 10    | -                    |
| [skill-tools](https://github.com/skill-tools/skill-tools)                      | CLI      | 2026-02-10 | Apache-2.0 | 9     | -                    |
| [instrlint](https://github.com/jed1978/instrlint)                              | CLI      | 2026-04-05 | MIT        | 8     | -                    |
| [skillscheck](https://github.com/Swival/skillscheck)                           | CLI      | 2026-03-11 | MIT        | 8     | -                    |
| [dogent](https://github.com/yegor256/dogent)                                   | CLI      | 2026-06-11 | MIT        | 8     | -                    |
| [skillci](https://github.com/kabirnarang39/skillci)                            | CLI      | 2026-07-21 | Apache-2.0 | 8     | -                    |
| [ai-context-kit](https://github.com/ofershap/ai-context-kit)                   | CLI      | 2026-03-04 | MIT        | 8     | -                    |
| [skillcheck](https://github.com/Sagargupta16/skillcheck)                       | CLI      | 2026-07-06 | MIT        | 5     | -                    |
| [claude-config-auditor](https://github.com/emreyildirim/claude-config-auditor) | CLI      | 2026-05-18 | MIT        | 5     | -                    |

## MCPツールスキーマ

これらのツールは、MCPサーバーのツール定義を確認する。

| Name                                                          | Engine | Created    | License    | Stars | Weekly npm downloads |
| ------------------------------------------------------------- | ------ | ---------- | ---------- | ----- | -------------------- |
| [mcp-assert](https://github.com/blackwell-systems/mcp-assert) | CLI    | 2026-04-23 | MIT        | 26    | -                    |
| [mcp-tef](https://github.com/StacklokLabs/mcp-tef)            | CLI    | 2025-12-11 | Apache-2.0 | 13    | -                    |
| [mcp-lint](https://github.com/robert19001-cmyk/mcp-lint)      | CLI    | 2026-03-25 | MIT        | 1     | 1,195                |

## モデルを使用するリンター

リンターのように見えるツールもあるが、各ルールをモデル経由で実行する。alintはESLintに似たCLIで、OpenAI互換のAPI[^alint]を通じてルールをモデルに送信する。また、TypeSafe AIの意思決定モデルであるJevを利用するものもある。

| Name                                                                       | Model                 |
| -------------------------------------------------------------------------- | --------------------- |
| [alint](https://github.com/alint-dev/alint)                                | OpenAI-compatible API |
| [jev-pref](https://github.com/doeixd/jev-pref)                             | Jev                   |
| [taste-lint](https://github.com/mblode/taste-lint)                         | Jev                   |
| [slop-grader](https://github.com/lukstei/slop-grader)                      | Jev                   |
| [pi-jev-anti-slop](https://www.npmjs.com/package/pi-jev-anti-slop)         | Jev                   |
| [lint-claude](https://github.com/vtemian/lint-claude)                      | Claude                |
| [@agimon-ai/vibe-lint](https://www.npmjs.com/package/@agimon-ai/vibe-lint) | LLM                   |

## リントルールに該当しない関連プロジェクト

「AI slop」に対抗する著名なプロジェクトの多くは、エージェントスキルやプロンプトである。例としては、stop-ai-slop、stop-slop、no-ai-slop、impeccable、taste-skillなどが挙げられる。stop-slopとno-ai-slopは、2026年11月18日時点でそれぞれ19,031件と13,601件のスターを獲得している。これらのスキルはモデル内で動作するため、実行ごとに結果が異なる可能性がある。カタログには記載されていない。

## 2026年の動向

これらのツールの多くは新しいものだ。作成日が分かっているエントリのうち、約44%が2026年8月以降に作成された。2026年10月だけで30件のエントリが追加された。Oxlint用のJSプラグインにより、Rustなしでルールを安価に公開できるようになった。ほとんどのエントリは依然としてスタンドアロンのCLIであり、あらゆる言語で動作する。

ルールは現在、文言だけでなくエビデンスもチェックする。プロシージャルールには、依然として「delve」などの単語が記載されている。コードルールは、テストが実際のコードを実行するかどうかを確認する。型アサーションに理由があるかどうかを確認する。設定ルールは、コンテキストファイルがコードと一致するかどうかを確認する。これらのチェックはいずれもモデルを必要としないため、あらゆる編集時に実行できる。

## 関連記事

- [Oxlint](/sloppedia/oxlint)
- [fallow](/sloppedia/fallow)
- [モジュール境界ツール](/sloppedia/module-boundary-tools)
- [意思決定モデル](/sloppedia/decision-model)
- [AIスロップ](/sloppedia/ai-slop)

[^landmines]: interfere-inc, "[landmines](https://github.com/interfere-inc/landmines)". 2026年11月18日閲覧。 [^vibe-proof]: SukkaW, "[eslint-plugin-vibe-proof](https://github.com/SukkaW/eslint-plugin-vibe-proof)". 2026年11月18日閲覧。 [^agent-slop-lint]: JordanGunn, "[agent-slop-lint](https://github.com/JordanGunn/agent-slop-lint)". 2026年11月18日閲覧。 [^enforced-architecture]: GLips, "[enforced-architecture](https://github.com/GLips/enforced-architecture)". 2026年11月18日閲覧。 [^shadcn-lint]: shadcn-ui, "[@shadcn/lint](https://github.com/shadcn-ui/lint)". 2026年11月18日閲覧。 [^agent-lint]: MartinCastroAlvarez, "[agent-lint](https://github.com/MartinCastroAlvarez/agent-lint)". 2026年11月18日閲覧。 [^suppress-ratchet]: motchalini-llc, "[Suppress Ratchet](https://github.com/motchalini-llc/suppress-ratchet)". 2026年11月18日閲覧。 [^anti-slop]: dmmulroy, "[anti-slop](https://github.com/dmmulroy/anti-slop)". 2026年11月18日閲覧。 [^no-comment-slop]: jantimon, "[eslint-plugin-no-comment-slop](https://github.com/jantimon/eslint-plugin-no-comment-slop)". 2026年11月18日閲覧。 [^windbag]: scale-venture-partners, "[windbag](https://github.com/scale-venture-partners/windbag)". 2026年11月18日閲覧。 [^renderlint]: ngocanhnckh, "[renderlint](https://github.com/ngocanhnckh/renderlint)". 2026年11月18日閲覧。 [^ai-writing]: textlint-ja, "[textlint-rule-preset-ai-writing](https://github.com/textlint-ja/textlint-rule-preset-ai-writing)". 2026年11月18日閲覧。 [^ai-words-ja]: p1ass, "[textlint-rule-preset-ai-words-ja](https://github.com/p1ass/textlint-rule-preset-ai-words-ja)". 2026年11月18日閲覧。 [^agnix]: agent-sh, "[agnix](https://github.com/agent-sh/agnix)". 2026年11月18日閲覧。 [^ctxlint]: YawLabs, "[ctxlint](https://github.com/YawLabs/ctxlint)". 2026年11月18日閲覧。 [^driftlint]: alifurkangokce, "[driftlint](https://github.com/alifurkangokce/driftlint)". 2026年11月18日閲覧。 [^agents-lint]: giacomo, "[agents-lint](https://github.com/giacomo/agents-lint)". 2026年11月18日閲覧。 [^alint]: alint-dev, "[alint](https://github.com/alint-dev/alint)". 2026年11月18日閲覧。
