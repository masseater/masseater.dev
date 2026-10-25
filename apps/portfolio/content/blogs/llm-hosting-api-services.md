---
title: "モデルを自社開発しない LLM API サービス（2026年10月25日時点）"
description: "他社が公開したモデルを自社の GPU で動かして API で売るサービスと、複数の推論事業者へ振り分ける窓口を、2026年10月25日時点の公式ページで確認してまとめた。"
tags: ["LLM", "API", "OpenRouter", "Ollama"]
published: true
---

モデルを自社で開発せず、他社のモデルを API で使えるようにしているサービスを集めた。自社の GPU で推論するサービスと、複数の推論事業者へリクエストを振り分ける窓口の 2 種類がある。価格は 2026年10月25日時点の各社公式ページで確認した。

## 開発元の API と比べた違い

| 観点         | 開発元の API を直接使う場合                       | ホスティング事業者を使う場合                                                   |
| ------------ | ------------------------------------------------- | ------------------------------------------------------------------------------ |
| データの扱い | DeepSeek や Moonshot は中国の事業者が運営している | 米国や EU のサーバーで動かし、ログを残さないと明記する事業者がある             |
| 使えるモデル | 開発元が API を出しているモデルだけ               | gpt-oss や Gemma のように、開発元が API を出していないモデルも使える           |
| 速度         | 開発元の基盤による                                | Groq や Cerebras は自社チップで、gpt-oss-120b を毎秒 500〜3,000 トークンで返す |
| 価格         | 開発元の定価                                      | 定価と同じところが多く、Chutes や SiliconFlow は定価より安い                   |
| 障害時       | 開発元が止まれば使えない                          | 同じモデルを載せた別の事業者に切り替えられる                                   |
| 精度         | 開発元の基準どおり                                | 量子化や実装の違いで、ツール呼び出しの精度が開発元より落ちる事業者がある       |
| 新機能       | 開発元が最初に出す                                | 新モデルや独自パラメータへの対応が遅れることがある                             |

精度の差は Moonshot が計測している。同社は Kimi のツール呼び出しを各事業者に約 4,000 回送って公式 API と比べる検証ツールを公開しており、2025年11月の結果では事業者間でスキーマの正確さが 100% から約 72% まで開いた[^kimi-verifier]。OpenRouter も同じモデルでも事業者によってツール呼び出しの頻度と正確さが大きく違うとして、成績のよい事業者だけに送る `:exacto` を用意した[^openrouter-exacto]。

## 同じモデルの価格

100 万トークンあたりの入力と出力の価格を、開発元の定価と並べた。

### Kimi K3

| 提供元             | 入力  | 出力   |
| ------------------ | ----- | ------ |
| Moonshot（開発元） | $3.00 | $15.00 |
| Together AI        | $3.00 | $15.00 |
| Fireworks AI       | $3.00 | $15.00 |
| Baseten            | $3.00 | $15.00 |
| Novita AI          | $3.00 | $15.00 |
| DeepInfra          | $2.85 | $14.25 |
| SiliconFlow        | $2.70 | $13.50 |
| Chutes             | $1.85 | $9.50  |

Moonshot の定価は公式ページを取得できず、同社のページを引用した複数の記事で確認した[^kimi-price]。

### DeepSeek V4 Pro

| 提供元                         | 入力  | 出力  |
| ------------------------------ | ----- | ----- |
| DeepSeek（開発元、混雑時間帯） | $1.32 | $3.96 |
| DeepSeek（開発元、それ以外）   | $0.66 | $1.98 |
| Together AI                    | $1.32 | $3.96 |
| SiliconFlow                    | $1.32 | $3.96 |
| Cloudflare Workers AI          | $1.32 | $3.96 |
| Novita AI                      | $1.60 | $3.20 |

DeepSeek は平日 UTC 1〜4 時と 6〜10 時を混雑時間帯とし、それ以外は半額にしている[^deepseek-price]。

### gpt-oss-120b

OpenAI は gpt-oss の API を出していないので、ホスティング事業者だけの比較になる。

| 提供元                | 入力   | 出力   | 速度（公称）          |
| --------------------- | ------ | ------ | --------------------- |
| Novita AI             | $0.05  | $0.25  | —                     |
| SiliconFlow           | $0.05  | $0.45  | —                     |
| Baseten               | $0.10  | $0.50  | —                     |
| Groq                  | $0.15  | $0.60  | 毎秒 500 トークン     |
| Together AI           | $0.15  | $0.60  | —                     |
| Fireworks AI          | $0.15  | $0.60  | —                     |
| Ollama Cloud          | $0.15  | $0.60  | —                     |
| Cloudflare Workers AI | $0.35  | $0.75  | —                     |
| Cerebras              | 未掲載 | 未掲載 | 毎秒約 3,000 トークン |

## 自社で推論するサービス

### 従量課金の推論 API

| サービス              | 特徴                                                                                           | 補足                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Together AI           | オープンモデルの品揃えが広く、LoRA と全パラメータのファインチューニングも受け付ける[^together] | 専有 GPU は H100 が 1 時間 $5.49                                                 |
| Fireworks AI          | Standard と Priority の 2 段階の価格があり、バッチは半額[^fireworks]                           | 米国リージョンに限定したモデルは割高                                             |
| DeepInfra             | 単価が安く、Claude や Gemini も同じ API で売っている[^deepinfra]                               | Flex は 0.8 倍、Priority は 1.5 倍の価格                                         |
| Baseten               | 自前のモデルや微調整したモデルを API にする用途が中心[^baseten]                                | 待機時間は課金しない                                                             |
| Novita AI             | 約 75 の LLM と GPU の貸し出し。バッチは導入記念で半額[^novita]                                | —                                                                                |
| SiliconFlow           | 中国系モデルの最新版を多く載せる[^siliconflow]                                                 | 新規登録で $1 分の無料枠                                                         |
| Nebius Token Factory  | 旧 Nebius AI Studio。高速版と通常版を選べる[^nebius]                                           | —                                                                                |
| Groq                  | 自社の LPU で高速に返す。量産モデルは gpt-oss と Llama と Whisper[^groq-models]                | 2025年12月に NVIDIA へ技術を供与し、GroqCloud だけが独立して残った[^groq-nvidia] |
| Cerebras              | ウェハースケールの自社チップで最速クラス[^cerebras]                                            | 共有の推論は 2 モデルだけ。最初に $5 分の無料枠                                  |
| SambaNova             | 自社の RDU で推論する[^sambanova]                                                              | 公開している価格は 6 モデル分                                                    |
| Cloudflare Workers AI | 1 日 1 万 Neuron まで無料で、超過分は 1,000 Neuron あたり $0.011[^workers-ai]                  | 2025年12月に買収した Replicate の画像・動画モデルも統合中[^replicate]            |
| Hyperbolic            | 25 以上のオープンモデルを OpenAI 互換で提供[^hyperbolic]                                       | —                                                                                |
| さくらのAI Engine     | 国内の事業者で、月 3,000 リクエストまで無料[^sakura]                                           | 2026年10月8日に専有型のプライベートエディションを開始                            |

### 月額プランがあるサービス

| サービス     | 料金                                                                                  | 枠の考え方                                                        | 補足                                                                              |
| ------------ | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Ollama Cloud | Free 無料、Pro $20（$60 分込み）、Max $100（$300 分込み）、Team $500（$1,000 分込み） | トークン単価から差し引く。同時実行は Free 1、Pro 3、Max 10        | 平日 UTC 12〜18 時以外は割引単価。ログを残さず、主に米国で動かす[^ollama-pricing] |
| opencode Go  | Go $10、Go Plus $40                                                                   | モデルごとに月の上限があり、5 時間で 20%、1 週間で 50% まで使える | GLM、Kimi、Qwen、DeepSeek など 32 モデル[^opencode-go]                            |
| Synthetic    | Go $9、Standard $30、Big $90                                                          | 週ごとに回復するクレジット                                        | 2 倍速の Fast モードを試験提供[^synthetic]                                        |
| Chutes       | Plus $10（1 日 2,000 リクエスト）、Pro $20（1 日 5,000 リクエスト）                   | 従量換算で月 $50 と $100 が上限                                   | 全モデルを TEE で動かす。大量の自動処理は従量課金を使うよう求めている[^chutes]    |
| Featherless  | Basic $10（15B まで）、Premium $25（全モデル）                                        | トークンは無制限で、同時接続数で制限する                          | 大きいモデルほど同時接続の枠を多く使う[^featherless]                              |

Ollama Cloud は 2026年8月31日に、5 時間と 1 週間の上限からトークン単価での差し引きに切り替えた[^ollama-blog]。

## 複数の推論事業者へ振り分ける窓口

自社では推論せず、上の事業者や開発元へリクエストを中継する。1 つのキーと 1 つの請求で多数のモデルを使えるのが利点で、手数料の取り方に差がある。

| 窓口                             | モデル数（公称）     | 手数料                                          | 振り分けの機能                                                                                  |
| -------------------------------- | -------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| OpenRouter                       | 500 以上、80 社以上  | クレジット購入時に 5.5%（Business は 8%）       | 価格や速度で事業者を選ぶ。`openrouter/auto` はプロンプトごとにモデルも選ぶ[^openrouter-pricing] |
| Hugging Face Inference Providers | 18 事業者のモデル    | 事業者の価格に上乗せなし                        | モデル名の末尾に `:fastest` や `:cheapest` を付けて選ぶ[^hf-providers]                          |
| Requesty                         | 600 以上             | 5% 上乗せ                                       | フォールバックとレイテンシ基準の振り分け。EU にデータを置ける[^requesty]                        |
| OrcaRouter                       | 200 以上             | 上乗せなし。Team プランは月 $499 の機能料       | `orcarouter/auto` が品質と価格の条件でモデルを選ぶ[^orcarouter]                                 |
| Vercel AI Gateway                | 一覧ページに掲載     | 上乗せなし。決済手数料は利用者が負担            | フォールバック。振り分けの規則は利用者が書く[^vercel]                                           |
| Cloudflare AI Gateway            | 6 社と Workers AI    | Unified Billing のクレジット購入時に 5%         | リトライとフォールバック[^cloudflare-billing]                                                   |
| Kilo Gateway                     | 500 以上、60 社以上  | 上乗せなし                                      | なし。Kilo Code から使う窓口[^kilo]                                                             |
| LLM Gateway                      | 200 以上、40 社以上  | クレジット購入時に 5%                           | 同じモデルを載せた事業者の自動選択。AGPLv3 で自前運用もできる[^llmgateway]                      |
| opencode Zen                     | 主要各社のモデル     | クレジット購入ごとに 4.6% と $0.31              | なし。OpenCode のほか Anthropic 互換や Gemini 互換の API で使える[^opencode-zen]                |
| NanoGPT                          | 画像や動画も含め多数 | テキストは定価。事業者の固定指定と自前キーは 5% | なし[^nanogpt]                                                                                  |

`openrouter/auto` はプロンプトを約 30 種類のタスクに分け、直近 7 日間に OpenRouter の利用者がそのタスクでどのモデルに支払ったかを基準に選ぶ[^openrouter-auto]。モデルの選定には Not Diamond の技術を使っている[^notdiamond]。2026年8月には、Stripe が OpenRouter を 70 億ドル超で買収することに合意したと報じられた[^stripe-openrouter]。

## 対象外にしたサービス

| サービス                                     | 外した理由                                                                                          |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Qoder                                        | IDE と CLI の中だけで使え、外から呼べる API がない。モデルは Qwen、DeepSeek、GLM、Kimi など[^qoder] |
| GitHub Copilot、Kiro、Zed などの開発ツール   | ツールの利用枠として複数社のモデルを売っており、API としては提供していない                          |
| Cursor                                       | 2026年8月に SpaceXAI（旧 xAI）の傘下に入り、開発元の製品になった[^cursor]                           |
| Amazon Bedrock、Microsoft Foundry、Vertex AI | 他社モデルも売っているが、自社モデルも開発している                                                  |
| LiteLLM、Bifrost、Portkey                    | 自社のサーバーで動かす中継ソフトで、推論もモデルの販売もしない                                      |
| GitHub Models                                | 2026年7月30日に提供を終えた[^github-models]                                                         |

[^kimi-verifier]: [Together vs Fireworks vs Groq: Price the Tool Call, Not the Token](https://www.beri.net/article/together-vs-fireworks-vs-groq-open-weight-inference-tool-call-accuracy-2026)。検証ツールの説明は [K2-Vendor-Verifier](https://platform.kimi.ai/blog/posts/K2_Vendor_Verifier_Newsletter)。

[^openrouter-exacto]: [Provider Variance: Introducing Exacto](https://openrouter.ai/blog/announcements/provider-variance-introducing-exacto/)

[^kimi-price]: [Kimi K3 API guide](https://www.verdent.ai/guides/agents/kimi-k3-api-guide)

[^deepseek-price]: [DeepSeek API Pricing](https://api-docs.deepseek.com/quick_start/pricing)

[^together]: [Together AI Pricing](https://www.together.ai/pricing)

[^fireworks]: [Fireworks Serverless Pricing](https://docs.fireworks.ai/serverless/pricing)

[^deepinfra]: [DeepInfra Pricing](https://deepinfra.com/pricing)

[^baseten]: [Baseten Pricing](https://www.baseten.co/pricing/)

[^novita]: [Novita AI Pricing](https://novita.ai/pricing)

[^siliconflow]: [SiliconFlow Pricing](https://www.siliconflow.com/pricing)

[^nebius]: [Nebius Token Factory Prices](https://tokenfactory.nebius.com/organization/prices)

[^groq-models]: [GroqCloud Models](https://console.groq.com/docs/models)

[^groq-nvidia]: [Groq AI in 2026: Nvidia Deal, LPU Architecture, GroqCloud](https://www.voiceflow.com/blog/groq)

[^cerebras]: [Cerebras Supported Models](https://inference-docs.cerebras.ai/models/overview)

[^sambanova]: [SambaNova（BenchLM）](https://benchlm.ai/hosts/sambanova)

[^hyperbolic]: [Hyperbolic Serverless Inference](https://docs.hyperbolic.ai/inference/overview)

[^workers-ai]: [Workers AI Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)

[^replicate]: [Cloudflare to Acquire Replicate](https://www.businesswire.com/news/home/20251117400765/en/Cloudflare-to-Acquire-Replicate-to-Build-the-Most-Seamless-AI-Cloud-for-developers)

[^sakura]: [さくらのAI Engine の発表内容（クラウドWatch）](https://cloud.watch.impress.co.jp/docs/news/2146822.html)

[^ollama-pricing]: [Ollama Pricing](https://ollama.com/pricing)

[^ollama-blog]: [Ollama Blog](https://www.ollama.com/blog)

[^opencode-go]: [OpenCode Go](https://opencode.ai/docs/go/)

[^synthetic]: [Synthetic Pricing](https://synthetic.new/pricing)

[^chutes]: [Chutes Pricing](https://chutes.ai/pricing)

[^featherless]: [Featherless Plans](https://featherless.ai/docs/plans)

[^openrouter-pricing]: [OpenRouter Pricing](https://openrouter.ai/pricing)

[^hf-providers]: [Hugging Face Inference Providers](https://huggingface.co/docs/inference-providers/index)

[^requesty]: [Requesty Pricing](https://www.requesty.ai/pricing)

[^orcarouter]: [OrcaRouter](https://orcarouter.ai/)

[^vercel]: [Vercel AI Gateway Pricing](https://vercel.com/docs/ai-gateway/pricing)

[^cloudflare-billing]: [Cloudflare AI Gateway Unified Billing](https://developers.cloudflare.com/ai-gateway/features/unified-billing/)

[^kilo]: [Kilo Inference](https://kilo.ai/inference)

[^llmgateway]: [LLM Gateway Pricing](https://llmgateway.io/pricing)

[^opencode-zen]: [OpenCode Zen](https://opencode.ai/docs/zen/)

[^nanogpt]: [NanoGPT Pricing](https://nano-gpt.com/pricing)

[^openrouter-auto]: [OpenRouter Auto Router](https://openrouter.ai/docs/guides/routing/auto-model-selection)

[^notdiamond]: [Not Diamond](https://www.notdiamond.ai/)

[^stripe-openrouter]: [Stripe acquires OpenRouter（The Stack）](https://www.thestack.technology/stripe-acquires-openrouter-setting-up-a-battle-for-ai-routing-business/)

[^qoder]: [Qoder Model Tier Selector](https://docs.qoder.com/user-guide/chat/model-tier-selector)

[^cursor]: [Cursor Pricing](https://cursor.com/pricing)。買収の経緯は [Semafor](https://www.semafor.com/article/06/17/2026/spacex-wins-big-with-cursor)。

[^github-models]: [GitHub Models](https://docs.github.com/en/github-models)
