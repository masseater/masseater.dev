---
title: "AI情報の収集先（2026年10月25日時点）"
description: "AI の動向を追うために見ておけばよい情報源を、各 AI 企業の公式サイト、所属のはっきりした人の X、信頼できる個人・団体の特化サイト、企業の技術ブログに分け、日本語とそれ以外の言語で区別して並べた。"
tags: ["AI", "LLM", "情報収集"]
published: true
---

AI の動向を追うために見ておけばよい情報源を並べた。驚き屋と呼ばれる煽り中心のブログやアカウントは外し、情報の出し手の所属が公開されているものだけを載せている。X のアカウントは 2026年10月25日にプロフィールの所属表記を確認した。各項目の 1 行目は運営している個人・団体、2 行目は多い情報の種類（理論、研究、実運用）である。

## AI 企業・研究機関の公式サイト

### 日本語

主要な AI 企業は英語で発表するので、日本語の公式発信は Google の日本向けブログと、日本の研究開発組織に限られる。

* [Google Japan Blog](https://japan.googleblog.com/)
  * Google の日本法人が運営する公式ブログである。
  * Gemini などの製品発表の日本語版が多く、実運用寄りである。
* [Google Developers Japan](https://developers-jp.googleblog.com/)
  * Google の開発者向け公式ブログの日本語版である。
  * Gemini API や AI Studio の機能更新の翻訳記事が多く、実運用寄りである。
* [Sakana AI ブログ](https://sakana.ai/blog/)
  * 東京の AI 研究開発企業 Sakana AI が運営する。英語記事に `-jp` 付きの日本語版が併記され、日本語のみの記事もある。
  * 自社の研究成果の解説と製品発表が中心で、研究と実運用が半々である。
* [LLM-jp](https://llm-jp.nii.ac.jp/)
  * NII（国立情報学研究所）の LLM 研究開発センターが主宰する研究コミュニティである。
  * 日本語 LLM とコーパスの公開告知、勉強会の資料が多く、研究寄りである。

### それ以外の言語

* [OpenAI News](https://openai.com/news/)
  * OpenAI の公式ニュースである。
  * モデルと製品の発表、研究の要約が中心で、実運用寄りである。
* [Anthropic News](https://www.anthropic.com/news) と [Anthropic Research](https://www.anthropic.com/research)
  * Anthropic の公式ニュースと研究一覧である。
  * News はモデル発表と方針の発表、Research はアラインメントと解釈可能性の論文解説が多い。
* [Anthropic Engineering](https://www.anthropic.com/engineering)
  * Anthropic のエンジニアリングチームが運営する。
  * エージェント設計、Claude Code の作り方、社内開発基盤の話が多く、実運用寄りである。
* [Alignment Science Blog](https://alignment.anthropic.com/)
  * Anthropic のアラインメント研究チームが運営する。
  * 論文になる前の実験結果や中間報告が多く、研究寄りである。
* [Transformer Circuits Thread](https://transformer-circuits.pub/)
  * Anthropic の解釈可能性チームが運営する。
  * 回路やスパースオートエンコーダなどモデル内部の解析が中心で、理論と研究寄りである。
* [Google DeepMind Blog](https://deepmind.google/blog/)
  * Google DeepMind が運営する公式ブログである。
  * Gemini の発表と科学応用の研究成果が多く、研究と実運用が半々である。
* [Google Research Blog](https://research.google/blog/)
  * Google Research が運営する。
  * 論文の解説が中心で、研究寄りである。
* [Google The Keyword（AI）](https://blog.google/technology/ai/)
  * Google 本社の公式ブログの AI カテゴリである。
  * 製品発表が中心で、実運用寄りである。
* [AI at Meta Blog](https://ai.meta.com/blog/)
  * Meta の AI 部門が運営する。
  * Llama などのモデル公開と研究成果の解説が多く、研究寄りである。
* [Microsoft Research Blog](https://www.microsoft.com/en-us/research/blog/)
  * Microsoft Research が運営する。
  * 論文解説と研究プロジェクトの紹介が多く、研究寄りである。
* [Mistral AI News](https://mistral.ai/news)
  * フランスの Mistral AI が運営する公式ニュースである。
  * モデル公開と API の更新が中心で、実運用寄りである。
* [xAI News](https://x.ai/news)
  * xAI の公式ニュースである。
  * Grok のモデル発表が中心で、実運用寄りである。
* [DeepSeek API News](https://api-docs.deepseek.com/news)
  * 中国の DeepSeek が運営する API ドキュメント内の更新履歴である。モデル発表は Hugging Face と GitHub に出るので、ここが一次情報の入口になる。
  * モデルと API の変更点が中心で、実運用寄りである。
* [Qwen Blog](https://qwenlm.github.io/blog/)
  * Alibaba Cloud の Qwen チームが運営する。
  * モデル公開の技術的な説明が中心で、研究と実運用が半々である。
* [Hugging Face Blog](https://huggingface.co/blog)
  * Hugging Face が運営する。社員と外部投稿者の記事が混在する。
  * オープンモデルの学習・推論手法の解説が多く、実運用寄りである。
* [NVIDIA Technical Blog](https://developer.nvidia.com/blog/)
  * NVIDIA の開発者向け公式ブログである。
  * GPU 上での学習・推論の最適化、CUDA、Nemotron の話が多く、実運用寄りである。

## 所属のはっきりした人の X

### 日本語

* [岡野原大輔](https://x.com/hillbig)
  * Preferred Networks の共同創業者・CEO である。
  * 新しい論文の要点を短くまとめた投稿が多く、研究寄りである。
* [秋葉拓哉](https://x.com/iwiwi)
  * Sakana AI の Research Scientist である。
  * モデルマージや LLM の学習に関する自身の研究と、競技プログラミング由来の実装の話が多く、研究寄りである。
* [岡崎直観](https://x.com/chokkanorg)
  * 東京科学大学の教授で、日本語 LLM Swallow のプロジェクトリーダーである。
  * Swallow の公開情報と自然言語処理の研究動向が多く、研究寄りである。
* [藤井一喜](https://x.com/okoge_kaz)
  * 東京科学大学の博士課程で、Swallow の学習基盤を担う。
  * 大規模な分散学習の実装とハードウェアの話が多く、実運用寄りである。
* [鈴木潤](https://x.com/drJunSuzuki)
  * 東北大学の教授で、LLM-jp に参加する自然言語処理の研究者である。
  * 日本語 LLM の評価と学会の話が多く、研究寄りである。
* [坂口慶祐](https://x.com/KeisukeS_)
  * 東北大学の教授で、Allen Institute for AI の出身である。
  * 自然言語処理と評価ベンチマークの研究の話が多く、研究寄りである。
* [山田育矢](https://x.com/ikuyamada)
  * Studio Ousia の Chief Scientist で、東京理科大学の教授を兼ねる。
  * LLM とエージェントの研究、自身のモデル公開の話が多く、研究寄りである。
* [今井翔太](https://x.com/ImAI_Eruel)
  * JAIST（北陸先端科学技術大学院大学）の教授で、GenesisAI の CEO である。東京大学の松尾研で博士を取得した。
  * 強化学習と生成 AI の動向の解説が多く、理論と研究寄りである。
* [深津貴之](https://x.com/fladdict)
  * THE GUILD の代表で、note の CSO と弁護士ドットコムの CXO を務める。
  * プロンプト設計と生成 AI の業務への組み込みの話が多く、実運用寄りである。
* [布留川英一（npaka）](https://x.com/npaka123)
  * プログラマーで技術書の著者である。
  * 新しいモデルやツールを公開当日に試した記録が多く、実運用寄りである。
* [LLM勉強会（LLM-jp）](https://x.com/llm_jp)
  * LLM-jp の公式アカウントである。
  * モデル公開と勉強会の告知が中心で、研究寄りである。
* [SB Intuitions](https://x.com/sbintuitions)
  * ソフトバンク傘下の SB Intuitions の公式アカウントである。
  * 日本語 LLM Sarashina の公開と技術ブログの更新告知が中心で、研究と実運用が半々である。

### それ以外の言語

* [Sam Altman](https://x.com/sama)
  * OpenAI の CEO である。
  * 製品と会社の方針の発表が中心で、実運用寄りである。
* [Greg Brockman](https://x.com/gdb)
  * OpenAI の President・共同創業者である。
  * 新機能のデモとモデルの使い方の投稿が多く、実運用寄りである。
* [Noam Brown](https://x.com/polynoamial)
  * OpenAI で推論の研究を率いる。o シリーズの推論モデルの開発者である。
  * 推論とテスト時計算の研究の話が多く、研究寄りである。
* [Lilian Weng](https://x.com/lilianweng)
  * OpenAI の研究者で、2026年7月に Thinking Machines Lab から OpenAI に復帰した。ブログ Lil'Log の著者である。
  * 技術解説の長文記事の告知が多く、理論と研究寄りである。
* [Andrej Karpathy](https://x.com/karpathy)
  * OpenAI の創業メンバーで Tesla の AI 責任者を務めた後、2026年5月に Anthropic の事前学習チームに加わった[^karpathy-anthropic]。
  * LLM の学習の仕組みを解説する長文と、nanochat のような教育用の実装の話が多く、理論と研究寄りである。
* [Jan Leike](https://x.com/janleike)
  * Anthropic のアラインメント研究者で、OpenAI の Superalignment チームの元共同リーダーである。
  * アラインメント研究と安全性評価の話が多く、研究寄りである。
* [Alex Albert](https://x.com/alexalbert__)
  * Anthropic の研究者である。
  * Claude の新機能とプロンプトの書き方の投稿が多く、実運用寄りである。
* [Boris Cherny](https://x.com/bcherny)
  * Anthropic で Claude Code を作った責任者である。
  * Claude Code の使い方と開発現場での運用の話が多く、実運用寄りである。
* [Jack Clark](https://x.com/jackclarkSF)
  * Anthropic の共同創業者で、Import AI の筆者である。
  * AI 政策と研究動向の話が多く、研究寄りである。
* [Demis Hassabis](https://x.com/demishassabis)
  * Google DeepMind の共同創業者・CEO である。
  * Gemini の発表と科学応用の研究成果の話が中心で、研究寄りである。
* [Jeff Dean](https://x.com/JeffDean)
  * Google DeepMind と Google Research の Chief Scientist である。
  * Gemini の技術的な発表と論文の紹介が多く、研究寄りである。
* [Logan Kilpatrick](https://x.com/OfficialLoganK)
  * Google の Gemini API と AI Studio の製品担当である。
  * API と AI Studio の機能更新の告知が中心で、実運用寄りである。
* [Yann LeCun](https://x.com/ylecun)
  * AMI Labs の創業者で、ニューヨーク大学の教授である。Meta の Chief AI Scientist を 2025年に退いた。
  * 世界モデルの研究と LLM の限界に関する主張が多く、理論寄りである。
* [Soumith Chintala](https://x.com/soumithchintala)
  * Thinking Machines Lab に所属する。PyTorch の共同開発者で、2025年11月に Meta を離れた。
  * 学習フレームワークとオープンソースの話が多く、実運用寄りである。
* [Jim Fan](https://x.com/DrJimFan)
  * NVIDIA のロボティクス担当ディレクターで、GEAR ラボの共同リーダーである。
  * ロボットと身体性のある AI の研究の話が多く、研究寄りである。
* [Nathan Lambert](https://x.com/natolambert)
  * 2026年10月に設立された非営利研究所 Trillium Labs の創業者で、Ai2 で Olmo の事後学習を率いた。ニュースレター Interconnects の筆者である。
  * 事後学習とオープンモデルの動向の話が多く、研究寄りである。
* [Sebastian Raschka](https://x.com/rasbt)
  * 独立の研究エンジニアで、『Build a Large Language Model (From Scratch)』の著者である。
  * LLM の構造と学習手法を図で解説する投稿が多く、理論寄りである。
* [Simon Willison](https://x.com/simonw)
  * Datasette の作者で Django の共同開発者である。
  * 新しいモデルと API を自分で動かした記録が多く、実運用寄りである。
* [swyx](https://x.com/swyx)
  * Latent Space と smol.ai の運営者で、AI Engineer カンファレンスの主催者である。
  * AI エンジニアリングの業界動向の話が多く、実運用寄りである。
* [Chip Huyen](https://x.com/chipro)
  * 『AI Engineering』と『Designing Machine Learning Systems』の著者である。
  * LLM アプリケーションの設計と評価の話が多く、実運用寄りである。
* [Andrew Ng](https://x.com/AndrewYNg)
  * DeepLearning.AI の創業者で、Coursera の共同創業者、Stanford の非常勤教員である。
  * 業界動向の解説と教育コースの告知が多く、実運用寄りである。
* [David Ha（hardmaru）](https://x.com/hardmaru)
  * Sakana AI の共同創業者・CEO である。
  * 進化計算と集合知に基づく研究の話が多く、研究寄りである。
* [Llion Jones](https://x.com/YesThisIsLion)
  * Sakana AI の共同創業者で、Transformer を提案した論文の著者の一人である。
  * Transformer 以後の構造の研究の話が多く、理論と研究寄りである。

## 信頼できる個人・団体が運営する特化サイト

### 日本語

* [npaka（note）](https://note.com/npaka)
  * 布留川英一氏が個人で運営する note である。
  * 新しいモデル、API、エージェントツールを公開直後に試した手順の記録が中心で、実運用寄りである。
* [AIDB](https://ai-data-base.com/)
  * 株式会社 Parks が運営する論文解説メディアである。記事の多くは有料会員向けである。
  * 生成 AI とエージェントの論文を業務の課題に沿って解説する記事と、週次の注目論文リストが中心で、研究寄りである。
* [Ledge.ai](https://ledge.ai/)
  * 株式会社レッジが運営する AI 専門メディアである。
  * 国内企業の導入事例と製品発表のニュースが中心で、実運用寄りである。
* [AINOW](https://ainow.ai/)
  * ディップ株式会社が運営する AI 専門メディアである。
  * ツールの使い方と業界ニュースの解説記事が中心で、実運用寄りである。
* [Zenn の LLM トピック](https://zenn.dev/topics/llm)
  * クラスメソッドが運営する技術記事共有サービス Zenn の、LLM タグが付いた記事一覧である。
  * 個人と企業の試行記録が集まり、実運用寄りである。

### それ以外の言語

* [Import AI](https://importai.substack.com/)
  * Anthropic 共同創業者の Jack Clark が個人で書く週刊ニュースレターである。
  * 論文の要約と政策の動向が中心で、研究寄りである。
* [The Batch](https://www.deeplearning.ai/the-batch/)
  * Andrew Ng の DeepLearning.AI が運営する週刊ニュースレターである。
  * 業界ニュースの要約と Ng 氏の所感が中心で、実運用寄りである。
* [Interconnects](https://www.interconnects.ai/)
  * Nathan Lambert が書くニュースレターである。
  * 事後学習、RLHF、オープンモデルの動向の解説が中心で、研究寄りである。
* [Latent Space](https://latent.space/)
  * swyx と Alessio Fanelli が運営するニュースレターとポッドキャストである。
  * AI エンジニアリングの実践者へのインタビューが中心で、実運用寄りである。
* [Simon Willison's Weblog](https://simonwillison.net/)
  * Simon Willison の個人ブログである。
  * モデルと API の試用記録、LLM ツールの開発記録が毎日近く更新され、実運用寄りである。
* [Lil'Log](https://lilianweng.github.io/)
  * Lilian Weng の個人ブログである。
  * 強化学習、拡散モデル、エージェントなどの手法を網羅的に解説する長文記事で、理論寄りである。
* [Ahead of AI](https://magazine.sebastianraschka.com/)
  * Sebastian Raschka のニュースレターである。
  * 論文の読み解きと LLM の構造の比較が中心で、理論と研究寄りである。
* [Don't Worry About the Vase](https://thezvi.substack.com/)
  * Zvi Mowshowitz が個人で書くブログである。
  * 週刊の AI 動向まとめが中心で、研究と政策の話が多い。
* [Hugging Face Papers](https://huggingface.co/papers)
  * Hugging Face が運営する日次の論文一覧である。2025年7月に閉鎖された Papers with Code の受け皿でもある[^pwc-shutdown]。
  * arXiv の新着論文から注目度の高いものが並び、研究寄りである。
* [alphaXiv](https://www.alphaxiv.org/)
  * Stanford 発のチームが運営する arXiv 論文の議論サイトである。
  * 論文ごとのコメントと要約が付き、研究寄りである。
* [arXiv cs.CL 新着](https://arxiv.org/list/cs.CL/recent) と [cs.AI 新着](https://arxiv.org/list/cs.AI/recent)
  * Cornell University が運営するプレプリントサーバの新着一覧である。
  * 一次情報の論文そのもので、研究寄りである。
* [LMArena](https://lmarena.ai/)
  * UC Berkeley 発の LMArena が運営する、人間の投票によるモデル比較のリーダーボードである。
  * モデルの相対評価が中心で、実運用寄りである。
* [Artificial Analysis](https://artificialanalysis.ai/)
  * 独立のベンチマーク企業 Artificial Analysis が運営する。
  * モデルと API 提供者の品質、速度、価格の比較が中心で、実運用寄りである。
* [Epoch AI](https://epoch.ai/)
  * 非営利の研究機関 Epoch AI が運営する。
  * 計算量、学習データ、ハードウェアの推移の統計が中心で、研究寄りである。
* [METR](https://metr.org/)
  * 非営利の評価機関 METR が運営する。
  * AI が自律的にこなせる作業時間の計測など、能力評価の研究が中心で、研究寄りである。
* [Stanford AI Index](https://hai.stanford.edu/ai-index)
  * Stanford HAI が運営する年次報告である。
  * 研究、産業、政策の統計をまとめた報告書で、研究寄りである。
* [BAIR Blog](https://bair.berkeley.edu/blog/)
  * UC Berkeley の AI 研究所が運営する。
  * 所属研究者による自身の論文の解説が中心で、研究寄りである。
* [SemiAnalysis](https://semianalysis.com/)
  * Dylan Patel が率いる半導体の調査会社が運営する。記事の多くは有料である。
  * GPU、データセンター、学習基盤の供給と費用の分析が中心で、実運用寄りである。

## 企業の技術ブログ

### 日本語

* [Preferred Networks テクノロジーブログ](https://www.preferred.jp/ja/blog/tech)
  * Preferred Networks が運営する。
  * 自社の LLM の学習、評価ベンチマーク、科学計算への応用の話が多く、研究寄りである。
* [SB Intuitions Tech Blog](https://www.sbintuitions.co.jp/blog/)
  * SB Intuitions が運営する。
  * 日本語 LLM Sarashina の学習と評価、画像・動画生成の研究が中心で、研究寄りである。
* [ELYZA Tech Blog](https://zenn.dev/p/elyza)
  * 日本語 LLM を開発する ELYZA が Zenn で運営する。
  * 日本語 LLM の学習と評価の話が多く、研究寄りである。
* [Stockmark Tech Blog](https://stockmark-tech.hatenablog.com/)
  * ストックマークが運営する。
  * 文書読解モデルの学習、LLM-as-a-Judge の評価、エージェント開発の話が多く、研究と実運用が半々である。
* [ABEJA Tech Blog](https://tech-blog.abeja.asia/)
  * ABEJA が運営する。
  * LLM の追加学習、ロボットへの VLM の応用、学会参加報告が多く、研究と実運用が半々である。
* [Turing Tech Blog](https://zenn.dev/p/turing_motors)
  * 自動運転のチューリングが Zenn で運営する。
  * 視覚言語モデルの学習と車載への適用の話が多く、研究寄りである。
* [Algomatic Tech Blog](https://zenn.dev/p/algomatic)
  * 生成 AI 事業の Algomatic が Zenn で運営する。
  * LLM アプリケーションの設計とエージェントの運用の話が多く、実運用寄りである。
* [LayerX エンジニアブログ](https://tech.layerx.co.jp/)
  * LayerX が運営する。
  * 社内のコーディングエージェントや AI を組み込んだ開発体制の話が多く、実運用寄りである。
* [CyberAgent Developers Blog](https://developers.cyberagent.co.jp/blog/)
  * サイバーエージェントが運営する。
  * 自社 LLM の開発と広告事業への応用の話が多く、研究と実運用が半々である。
* [LINEヤフー Tech Blog](https://techblog.lycorp.co.jp/ja)
  * LINEヤフーが運営する。
  * 大規模サービスでの LLM 活用と検索・推薦の話が多く、実運用寄りである。
* [Mercari Engineering Blog](https://engineering.mercari.com/blog/)
  * メルカリが運営する。
  * 開発への AI エージェント導入と、検索・不正検知への機械学習の適用の話が多く、実運用寄りである。
* [リクルート データ推進室ブログ](https://blog.recruit.co.jp/data/)
  * リクルートのデータ組織が運営する。
  * 自社サービスでの LLM 活用と評価の話が多く、実運用寄りである。
* [DeNA Engineering Blog](https://engineering.dena.com/blog/)
  * DeNA が運営する。
  * ゲームやライブ配信での AI 活用と Kaggle の話が多く、実運用寄りである。
* [DevelopersIO](https://dev.classmethod.jp/)
  * クラスメソッドが運営する。
  * Amazon Bedrock などクラウドの AI サービスを試した手順の記録が多く、実運用寄りである。

### それ以外の言語

* [GitHub Blog（AI & ML）](https://github.blog/ai-and-ml/)
  * GitHub が運営する。
  * Copilot とコーディングエージェントの機能更新と使い方が多く、実運用寄りである。
* [LangChain Blog](https://blog.langchain.com/)
  * LangChain が運営する。
  * エージェントの設計パターンと自社フレームワークの更新が多く、実運用寄りである。
* [Cursor Blog](https://cursor.com/blog)
  * Cursor が運営する。
  * コーディングエージェントの機能と内部の仕組みの話が多く、実運用寄りである。
* [Cloudflare Blog（AI）](https://blog.cloudflare.com/tag/ai/)
  * Cloudflare が運営する。
  * エッジでの推論と AI エージェントの基盤の話が多く、実運用寄りである。
* [Vercel Blog](https://vercel.com/blog)
  * Vercel が運営する。
  * AI SDK とエージェントの構築の話が多く、実運用寄りである。
* [Databricks Blog](https://www.databricks.com/blog)
  * Databricks が運営する。
  * データ基盤上での LLM の学習と運用の話が多く、実運用寄りである。
* [AWS Machine Learning Blog](https://aws.amazon.com/blogs/machine-learning/)
  * AWS が運営する。
  * Bedrock と SageMaker を使った構築手順が多く、実運用寄りである。
* [Google Cloud Blog（AI & ML）](https://cloud.google.com/blog/products/ai-machine-learning)
  * Google Cloud が運営する。
  * Vertex AI と Gemini を使った構築事例が多く、実運用寄りである。
* [Meta Engineering（AI Research）](https://engineering.fb.com/category/ai-research/)
  * Meta のエンジニアリング組織が運営する。
  * 大規模な学習基盤と推論の最適化の話が多く、実運用寄りである。
* [Netflix TechBlog](https://netflixtechblog.com/)
  * Netflix が運営する。
  * 推薦と基盤モデルの実サービスへの適用の話が多く、実運用寄りである。
* [Uber Engineering（AI）](https://www.uber.com/blog/engineering/ai/)
  * Uber が運営する。
  * 需要予測や LLM の社内活用の話が多く、実運用寄りである。
* [LinkedIn Engineering Blog](https://www.linkedin.com/blog/engineering)
  * LinkedIn が運営する。
  * 推薦と LLM を使った機能の開発の話が多く、実運用寄りである。

[^karpathy-anthropic]: [OpenAI co-founder Andrej Karpathy joins Anthropic's pre-training team](https://techcrunch.com/2026/05/19/openai-co-founder-andrej-karpathy-joins-anthropics-pre-training-team/)。TechCrunch、2026年5月19日。
[^pwc-shutdown]: [Papers with Code 公式リポジトリ](https://github.com/paperswithcode/paperswithcode-data)。2025年7月の閉鎖後、URL は Hugging Face Papers に転送される。
