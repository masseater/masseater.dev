---
title: "Google の AI によるコーディング"
description: "Google が社内のソフトウェア開発に AI を取り入れてきた経過。2022年のコード補完から、2026年の新しいコードの75%の生成、Antigravity のエージェントまでを扱う。"
tags: ["Google", "AI", "ソフトウェア開発", "2026年のソフトウェア"]
published: true
infobox:
  - label: "AI が生成した新しいコード"
    value: "25%超（2024年10月）、50%（2025年秋）、75%（2026年4月）"
  - label: "社内の主な道具"
    value: "IDE の補完、Critique の修正案、Antigravity"
  - label: "社内の AI 開発ツールのトークン"
    value: "1日に3兆超（2026年5月）"
  - label: "情報の時点"
    value: "2026年11月7日"
---

Google の AI によるコーディングは、Google が社内のソフトウェア開発に機械学習と大規模言語モデルを取り入れてきた経過を指す。2022年のコード補完に始まり、コードレビューの修正案や大規模な移行に広がった。2026年4月には、新しいコードの75%を AI が生成し、エンジニアが承認していると CEO の Sundar Pichai が書いた[^next-2026]。

## 年表

| 時期       | 出来事                                                              |
| ---------- | ------------------------------------------------------------------- |
| 2022年7月  | 機械学習によるコード補完の効果を報告[^completion]                   |
| 2023年5月  | レビューのコメントから修正案を作る仕組みを報告[^review]             |
| 2024年6月  | コードの文字の50%が AI の補完で入力されるようになったと報告[^ai-se] |
| 2024年10月 | 新しいコードの25%超を AI が生成と発表[^q3-2024]                     |
| 2025年1月  | AI による社内のコードの移行の事例を論文で報告[^migration]           |
| 2025年11月 | [Antigravity](/sloppedia/google-antigravity) を公開[^antigravity]   |
| 2026年4月  | 新しいコードの75%を AI が生成と発表[^next-2026]                     |
| 2026年5月  | Antigravity 2.0 を公開[^antigravity-2]                              |

## コード補完

2022年、Google は機械学習によるコード補完を社内の1万人を超える開発者に3か月間使わせ、使わない群と比べた。補完を受け入れて入った文字は新しいコードの3%で、ビルドとテストの間の時間は6%縮んだ[^completion]。

2024年6月の報告では、補完の候補の受け入れ率は37%になった。コードの文字の50%が AI の補完で入り、人が打つ文字と同じ量に達した[^ai-se]。

## コードレビュー

2023年には、レビュアーのコメントに合わせて修正案を作る仕組みを社内に出した。作者は、見た修正案の40〜50%を採用した[^review]。2024年には、レビューのコメントの8%を超える分が AI の手助けで解決されていた[^ai-se]。[Google のコードレビュー](/sloppedia/google-code-review)を参照。

## 移行

2025年1月の論文は、AI を使った社内のコードの移行の事例をまとめた[^migration]。

| 移行                                      | 結果                                                       |
| ----------------------------------------- | ---------------------------------------------------------- |
| Google 広告の ID を32ビットから64ビットへ | 入った変更の80%が AI だけで書かれ、全体の時間は約50%減った |
| JUnit3 から JUnit4 へ                     | 3か月で5,359ファイル、14万9,000行超を変更した              |

JUnit の移行では、AI が生成したコードの約87%が手直しなしでコミットされた[^migration]。こうした移行は、これまで[大規模変更](/sloppedia/large-scale-changes)の道具で行ってきた作業にあたる。

## 生成の割合

Pichai は、AI が生成する新しいコードの割合を何度か公表している。

| 時点       | 割合  | 出典                                                |
| ---------- | ----- | --------------------------------------------------- |
| 2024年10月 | 25%超 | 決算説明会[^q3-2024]                                |
| 2025年秋   | 50%   | 2026年4月の投稿で「昨秋」の値として言及[^next-2026] |
| 2026年4月  | 75%   | Google Cloud Next 2026 の投稿[^next-2026]           |

2024年の発表では、AI が生成したコードをエンジニアがレビューして受け入れると説明した[^q3-2024]。2026年4月の投稿は、エンジニアが自律的なエージェントを動かす「真にエージェント的なワークフロー」に移っていると書いた[^next-2026]。エージェントとエンジニアが共同で行った複雑な移行は、1年前にエンジニアだけで行うより6倍速く終わったという[^next-2026]。

## Antigravity

Antigravity は、Google が2025年11月18日に公開したエージェント型の開発環境である。Gemini 3 とともに出し、エディタの画面と、複数のエージェントを動かして見守る管理の画面を持つ[^antigravity]。公開時には、Gemini 3 のほか Anthropic の Claude Sonnet 4.5 と OpenAI の GPT-OSS も選べた[^antigravity]。

2026年5月19日の Antigravity 2.0 は、エディタを持たない単独のデスクトップアプリになった。主のエージェントがサブエージェントを定義して呼び出す機能や、定期実行の機能を持つ[^antigravity-2]。

Pichai は、Gemini の macOS 版の最初のリリースを Antigravity で作り、数日で Swift のアプリの試作まで進んだと書いた[^next-2026]。2026年7月の決算説明会では、Antigravity の週間の利用者が240万人を超えたと述べた。Chrome のあるチームは、モデルによるリファクタリングで2年の予定を3か月に縮める見込みだという[^q2-2026]。

## 社内の利用量

2026年5月の I/O で Pichai は、社内の AI 開発ツールが処理したトークンは、3月には1日あたり5,000億だったと述べた。数週間ごとに倍増し、I/O の時点では1日あたり3兆を超えていた[^io-2026]。

2026年10月の決算説明会では、Chrome、広告、検索のチームが Gemini 4 Argon を使った結果を挙げた。出したコードは35%増え、誤りは30%減ったという[^q3-2026]。

## 公開のリポジトリ

社内の外でも、Google の AI のエージェントがコードを書いている。2026年1月の [Bazel](/sloppedia/bazel) の変更履歴には、貢献者として Jules のアカウントが載っている[^bazel]。

## 評価

Business Insider は、Google がエンジニアに AI の利用を強く促しており、一部の人には人事評価に関わる AI の目標が課されていると報じた[^bi]。同じ記事は、Google DeepMind の一部の社員が Anthropic の [Claude Code](/sloppedia/claude-code) を使うことを認められたとも書いている[^bi]。

割合の数字には疑問も出ている。Semafor は、Pichai の挙げた所要時間の短縮を確かめるのはほぼ不可能だと書いた[^semafor]。2024年6月の報告は、AI の文字の割合を、受け入れた AI の文字を人が打った文字と足したもので割って求めると定義している[^ai-se]。一方、2026年の75%がどう数えた値かは示されていない。

[^completion]: Maxim Tabachnyk、Stoyan Nikolov「[ML-Enhanced Code Completion Improves Developer Productivity](https://research.google/blog/ml-enhanced-code-completion-improves-developer-productivity/)」2022年7月26日。

[^review]: Alexander Frömmgen、Lera Kharatyan「[Resolving code review comments with ML](https://research.google/blog/resolving-code-review-comments-with-ml/)」2023年5月23日。

[^ai-se]: Satish Chandra、Maxim Tabachnyk「[AI in software engineering at Google](https://research.google/blog/ai-in-software-engineering-at-google-progress-and-the-path-ahead/)」2024年6月6日。

[^q3-2024]: Sundar Pichai「[Alphabet Q3 earnings call: CEO Sundar Pichai's remarks](https://blog.google/inside-google/message-ceo/alphabet-earnings-q3-2024/)」2024年10月29日。

[^migration]: Stoyan Nikolov ほか「[How is Google using AI for internal code migrations?](https://arxiv.org/abs/2501.06972)」arXiv、2025年1月12日。

[^antigravity]: The Antigravity Team「[Introducing Google Antigravity](https://antigravity.google/blog/introducing-google-antigravity)」2025年11月18日。

[^antigravity-2]: The Antigravity Team「[Introducing Google Antigravity 2.0](https://antigravity.google/blog/introducing-google-antigravity-2)」2026年5月19日。

[^next-2026]: Sundar Pichai「[Sundar Pichai shares news from Google Cloud Next 2026](https://blog.google/innovation-and-ai/infrastructure-and-cloud/google-cloud/cloud-next-2026-sundar-pichai/)」2026年4月22日。

[^io-2026]: Sundar Pichai「[Google I/O 2026: Sundar Pichai's opening keynote](https://blog.google/innovation-and-ai/sundar-pichai-io-2026/)」2026年5月19日。

[^q2-2026]: Sundar Pichai「[Alphabet earnings call Q2 2026](https://blog.google/company-news/inside-google/message-ceo/alphabet-earnings-q2-2026/)」2026年7月22日。

[^q3-2026]: Sundar Pichai「[Q3 2026 earnings call: Remarks from our CEO](https://blog.google/company-news/inside-google/message-ceo/alphabet-earnings-q3-2026/)」2026年10月28日。

[^bazel]: Bazel「[Release 9.0.0 (2026-01-20)](https://bazel.googlesource.com/bazel/+/refs/tags/9.0.0%5E%21/)」CHANGELOG.md。

[^bi]: Hugh Langley「[Google says 75% of the company's new code is AI-generated](https://www.businessinsider.com/google-ai-generated-code-75-gemini-agents-software-2026-4)」Business Insider、2026年4月22日。

[^semafor]: Tom Chivers「[Google CEO says 75% of company's new code is AI-generated](https://www.semafor.com/article/04/24/2026/google-ceo-says-75-of-companys-new-code-is-ai-generated)」Semafor、2026年4月24日。
