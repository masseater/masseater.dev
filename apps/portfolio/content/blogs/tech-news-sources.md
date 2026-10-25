---
title: "技術情報の収集先（2026年10月25日時点）"
description: "自分が技術記事を追うときに見ている情報源を、企業・研究機関の公式サイト、個人の X、個人・団体のサイト、企業の技術ブログに分け、日本語かそれ以外の言語かで区別して並べた。"
tags: ["情報収集", "AI"]
published: true
---

自分が技術記事を追うときに見ている情報源を並べた。今は AI が大半を占める。煽り中心のブログやアカウントは入れていない。Qiita、Zenn、dev.to のような記事投稿ポータルサイトは基本的に見ない。X のアカウントのプロフィールは 2026年10月25日に確認した。各項目の 1 行目は運営している個人・団体、2 行目は多い情報の種類（理論、研究、実運用）。

## 企業・研究機関の公式サイト

### 日本語

主要な AI 企業は英語で発表するので、日本語の公式発信は Google の日本向けブログか、日本の研究開発組織に限られる。

* [Google Japan Blog](https://japan.googleblog.com/)
  * Google の日本法人が運営する公式ブログ。
  * Gemini などの製品発表の日本語版が多く、実運用寄り。
* [Google Developers Japan](https://developers-jp.googleblog.com/)
  * Google の開発者向け公式ブログの日本語版。
  * Gemini API や AI Studio の機能更新の翻訳記事が多く、実運用寄り。
* [Sakana AI ブログ](https://sakana.ai/blog/)
  * 東京の AI 研究開発企業 Sakana AI が運営する。英語記事に `-jp` 付きの日本語版が併記され、日本語のみの記事もある。
  * 自社の研究成果の解説、製品発表が中心で、研究・実運用が半々。
* [LLM-jp](https://llm-jp.nii.ac.jp/)
  * NII（国立情報学研究所）の LLM 研究開発センターが主宰する研究コミュニティ。
  * 日本語 LLM やコーパスの公開告知、勉強会の資料が多く、研究寄り。

### それ以外の言語

* [OpenAI News](https://openai.com/news/)
  * OpenAI の公式ニュース。
  * モデルや製品の発表、研究の要約が中心で、実運用寄り。
* [Anthropic News](https://www.anthropic.com/news)
  * Anthropic の公式ニュース。
  * モデル発表、安全性の方針の発表が中心で、実運用寄り。
* [Anthropic Research](https://www.anthropic.com/research)
  * Anthropic の研究一覧。
  * アラインメント、解釈可能性の論文解説が多く、研究寄り。
* [Anthropic Engineering](https://www.anthropic.com/engineering)
  * Anthropic のエンジニアリングチームが運営する。
  * エージェント設計、Claude Code の作り方、社内開発基盤の話が多く、実運用寄り。
* [Alignment Science Blog](https://alignment.anthropic.com/)
  * Anthropic のアラインメント研究チームが運営する。
  * 論文になる前の実験結果や中間報告が多く、研究寄り。
* [Transformer Circuits Thread](https://transformer-circuits.pub/)
  * Anthropic の解釈可能性チームが運営する。
  * 回路やスパースオートエンコーダなどモデル内部の解析が中心で、理論・研究寄り。
* [Google DeepMind Blog](https://deepmind.google/blog/)
  * Google DeepMind が運営する公式ブログ。
  * Gemini の発表、科学応用の研究成果が多く、研究・実運用が半々。
* [Google Research Blog](https://research.google/blog/)
  * Google Research が運営する。
  * 論文の解説が中心で、研究寄り。
* [Google The Keyword（AI）](https://blog.google/technology/ai/)
  * Google 本社の公式ブログの AI カテゴリ。
  * 製品発表が中心で、実運用寄り。
* [AI at Meta Blog](https://ai.meta.com/blog/)
  * Meta の AI 部門が運営する。
  * Llama などのモデル公開と研究成果の解説が多く、研究寄り。
* [Microsoft Research Blog](https://www.microsoft.com/en-us/research/blog/)
  * Microsoft Research が運営する。
  * 論文解説、研究プロジェクトの紹介が多く、研究寄り。
* [Mistral AI News](https://mistral.ai/news)
  * フランスの Mistral AI が運営する公式ニュース。
  * モデル公開、API の更新が中心で、実運用寄り。
* [xAI News](https://x.ai/news)
  * xAI の公式ニュース。
  * Grok のモデル発表が中心で、実運用寄り。
* [DeepSeek API News](https://api-docs.deepseek.com/news)
  * 中国の DeepSeek が運営する API ドキュメント内の更新履歴。モデル発表は Hugging Face や GitHub に出るので、ここが一次情報の入口になる。
  * モデルや API の変更点が中心で、実運用寄り。
* [Hugging Face Blog](https://huggingface.co/blog)
  * Hugging Face が運営する。社員の記事に外部投稿者の記事も混在する。
  * オープンモデルの学習・推論手法の解説が多く、実運用寄り。
* [NVIDIA Technical Blog](https://developer.nvidia.com/blog/)
  * NVIDIA の開発者向け公式ブログ。
  * GPU 上での学習・推論の最適化、CUDA、Nemotron の話が多く、実運用寄り。

## 個人の X

### 日本語

* [岡野原大輔](https://x.com/hillbig)
  * Preferred Networks の共同創業者・CEO。
  * 新しい論文の要点を短くまとめた投稿が多く、研究寄り。
* [秋葉拓哉](https://x.com/iwiwi)
  * Sakana AI の Research Scientist。
  * モデルマージや LLM の学習に関する自身の研究のほか、競技プログラミング由来の実装の話が多く、研究寄り。
* [岡崎直観](https://x.com/chokkanorg)
  * 東京科学大学の教授で、日本語 LLM Swallow のプロジェクトリーダー。
  * Swallow の公開情報、自然言語処理の研究動向が多く、研究寄り。
* [藤井一喜](https://x.com/okoge_kaz)
  * 東京科学大学の博士課程で、Swallow の学習基盤を担う。
  * 大規模な分散学習の実装やハードウェアの話が多く、実運用寄り。
* [鈴木潤](https://x.com/drJunSuzuki)
  * 東北大学の教授で、LLM-jp に参加する自然言語処理の研究者。
  * 日本語 LLM の評価や学会の話が多く、研究寄り。
* [坂口慶祐](https://x.com/KeisukeS_)
  * 東北大学の教授で、Allen Institute for AI の出身。
  * 自然言語処理、評価ベンチマークの研究の話が多く、研究寄り。
* [山田育矢](https://x.com/ikuyamada)
  * Studio Ousia の Chief Scientist で、東京理科大学の教授を兼ねる。
  * LLM やエージェントの研究、自身のモデル公開の話が多く、研究寄り。
* [今井翔太](https://x.com/ImAI_Eruel)
  * JAIST（北陸先端科学技術大学院大学）の教授で、GenesisAI の CEO。東京大学の松尾研で博士を取得した。
  * 強化学習や生成 AI の動向の解説が多く、理論・研究寄り。
* [深津貴之](https://x.com/fladdict)
  * THE GUILD の代表で、note の CSO、弁護士ドットコムの CXO を兼ねる。
  * プロンプト設計、生成 AI の業務への組み込みの話が多く、実運用寄り。
* [布留川英一（npaka）](https://x.com/npaka123)
  * プログラマーで技術書の著者。
  * 新しいモデルやツールを公開当日に試した記録が多く、実運用寄り。
* [LLM勉強会（LLM-jp）](https://x.com/llm_jp)
  * LLM-jp の公式アカウント。
  * モデル公開や勉強会の告知が中心で、研究寄り。
* [SB Intuitions](https://x.com/sbintuitions)
  * ソフトバンク傘下の SB Intuitions の公式アカウント。
  * 日本語 LLM Sarashina の公開、技術ブログの更新告知が中心で、研究・実運用が半々。

### それ以外の言語

* [Sam Altman](https://x.com/sama)
  * OpenAI の CEO。
  * 製品や会社の方針の発表が中心で、実運用寄り。
* [Greg Brockman](https://x.com/gdb)
  * OpenAI の President・共同創業者。
  * 新機能のデモ、モデルの使い方の投稿が多く、実運用寄り。
* [Noam Brown](https://x.com/polynoamial)
  * OpenAI で推論の研究を率いる。o シリーズの推論モデルの開発者。
  * 推論やテスト時計算の研究の話が多く、研究寄り。
* [Lilian Weng](https://x.com/lilianweng)
  * OpenAI の研究者で、2026年7月に Thinking Machines Lab から OpenAI に復帰した。ブログ Lil'Log の著者。
  * 技術解説の長文記事の告知が多く、理論・研究寄り。
* [Andrej Karpathy](https://x.com/karpathy)
  * OpenAI の創業メンバーで Tesla の AI 責任者を務めた後、2026年5月に Anthropic の事前学習チームに加わった[^karpathy-anthropic]。
  * LLM の学習の仕組みを解説する長文のほか、nanochat のような教育用の実装の話が多く、理論・研究寄り。
* [Jan Leike](https://x.com/janleike)
  * Anthropic のアラインメント研究者で、OpenAI の Superalignment チームの元共同リーダー。
  * アラインメント研究、安全性評価の話が多く、研究寄り。
* [Alex Albert](https://x.com/alexalbert__)
  * Anthropic の研究者。
  * Claude の新機能、プロンプトの書き方の投稿が多く、実運用寄り。
* [Boris Cherny](https://x.com/bcherny)
  * Anthropic で Claude Code を作った責任者。
  * Claude Code の使い方、開発現場での運用の話が多く、実運用寄り。
* [Jack Clark](https://x.com/jackclarkSF)
  * Anthropic の共同創業者で、Import AI の筆者。
  * AI 政策や研究動向の話が多く、研究寄り。
* [Demis Hassabis](https://x.com/demishassabis)
  * Google DeepMind の共同創業者・CEO。
  * Gemini の発表、科学応用の研究成果の話が中心で、研究寄り。
* [Jeff Dean](https://x.com/JeffDean)
  * Google DeepMind、Google Research 両方の Chief Scientist。
  * Gemini の技術的な発表、論文の紹介が多く、研究寄り。
* [Logan Kilpatrick](https://x.com/OfficialLoganK)
  * Google で Gemini API、AI Studio の製品を担当する。
  * Gemini API、AI Studio の機能更新の告知が中心で、実運用寄り。
* [Yann LeCun](https://x.com/ylecun)
  * AMI Labs の創業者で、ニューヨーク大学の教授。Meta の Chief AI Scientist を 2025年に退いた。
  * 世界モデルの研究、LLM の限界に関する主張が多く、理論寄り。
* [Soumith Chintala](https://x.com/soumithchintala)
  * Thinking Machines Lab に所属する。PyTorch の共同開発者で、2025年11月に Meta を離れた。
  * 学習フレームワークやオープンソースの話が多く、実運用寄り。
* [Jim Fan](https://x.com/DrJimFan)
  * NVIDIA のロボティクス担当ディレクターで、GEAR ラボの共同リーダー。
  * ロボットなど身体性のある AI の研究の話が多く、研究寄り。
* [Nathan Lambert](https://x.com/natolambert)
  * 2026年10月に設立された非営利研究所 Trillium Labs の創業者で、Ai2 で Olmo の事後学習を率いた。ニュースレター Interconnects の筆者。
  * 事後学習、オープンモデルの動向の話が多く、研究寄り。
* [Sebastian Raschka](https://x.com/rasbt)
  * 独立の研究エンジニアで、『Build a Large Language Model (From Scratch)』の著者。
  * LLM の構造や学習手法を図で解説する投稿が多く、理論寄り。
* [Simon Willison](https://x.com/simonw)
  * Datasette の作者で Django の共同開発者。
  * 新しいモデルや API を自分で動かした記録が多く、実運用寄り。
* [swyx](https://x.com/swyx)
  * Latent Space、smol.ai の運営者で、AI Engineer カンファレンスを主催する。
  * AI エンジニアリングの業界動向の話が多く、実運用寄り。
* [Chip Huyen](https://x.com/chipro)
  * 『AI Engineering』『Designing Machine Learning Systems』の著者。
  * LLM アプリケーションの設計、評価の話が多く、実運用寄り。
* [Andrew Ng](https://x.com/AndrewYNg)
  * DeepLearning.AI の創業者で、Coursera の共同創業者、Stanford の非常勤教員。
  * 業界動向の解説、教育コースの告知が多く、実運用寄り。
* [David Ha（hardmaru）](https://x.com/hardmaru)
  * Sakana AI の共同創業者・CEO。
  * 進化計算や集合知に基づく研究の話が多く、研究寄り。
* [Llion Jones](https://x.com/YesThisIsLion)
  * Sakana AI の共同創業者で、Transformer を提案した論文の著者の一人。
  * Transformer 以後の構造の研究の話が多く、理論・研究寄り。

## 個人・団体のサイト

### 日本語

* [npaka（note）](https://note.com/npaka)
  * 布留川英一氏が個人で運営する note。
  * 新しいモデル、API、エージェントツールを公開直後に試した手順の記録が中心で、実運用寄り。
* [karaage.](https://karaage.hatenadiary.jp/)
  * からあげ氏の個人ブログ。Maker・カメラ・AI の記事を 2,700 本以上書いている。
  * ローカル LLM、DGX Spark、AI エージェントの接続を自宅の機材で試した記録が多く、実運用寄り。
* [きしだのHatena](https://nowokay.hatenablog.com/)
  * 『プロになるJava』共著者のきしだなおき氏の個人ブログ。
  * 公開されたオープンモデルを手元の GPU で動かして性能を確かめる記事がほぼ毎日出ており、実運用寄り。
* [laiso](https://blog.lai.so/)
  * プログラマー laiso 氏の個人ブログ。『作って学ぶAIエージェント』の著者で、Software Design にも寄稿する。
  * 判定タスク向けの小型モデル、エージェントハーネスで開発パイプラインを組む設計の話が多く、実運用寄り。
* [shiba_yu36 の日記](https://blog.shibayu36.org/)
  * LayerX のソフトウェアエンジニア shiba_yu36 氏の個人ブログ。
  * 自作 GPT に KV キャッシュを実装して計測するなど、LLM の仕組みを手で確かめる記事が多く、理論・実運用寄り。
* [u++の備忘録](https://upura.hatenablog.com/)
  * Google Cloud Japan の Developer Advocate、石原祥太郎氏の個人ブログ。Kaggle Grandmaster。
  * 自身の採択論文の解説、日本語データセットの話が多く、研究寄り。
* [日本語LLMまとめ](https://llm-jp.github.io/awesome-japanese-llm/)
  * LLM-jp の有志が GitHub で管理する一覧。
  * 公開された日本語 LLM、埋め込みモデル、評価ベンチマークを開発元・ライセンス付きで網羅し、研究寄り。
* [Swallow LLM](https://swallow-llm.github.io/index.ja.html)
  * 東京科学大学の岡崎研・横田研、産総研による日本語 LLM プロジェクトのサイト。
  * モデル公開、学習レシピ、Swallow Leaderboard の評価結果が中心で、研究寄り。
* [Japan AISI](https://aisi.go.jp/)
  * IPA に置かれた日本の AI セーフティ・インスティテュート。
  * AI の安全性評価の手法、各国 AISI との連携、国内外の動向の定期報告が中心で、研究・政策寄り。
* [Ledge.ai](https://ledge.ai/)
  * 株式会社レッジが運営する AI 専門メディア。
  * 国内企業の導入事例、製品発表のニュースが中心で、実運用寄り。

### それ以外の言語

* [Import AI](https://importai.substack.com/)
  * Anthropic 共同創業者の Jack Clark が個人で書く週刊ニュースレター。
  * 論文の要約と政策の動向が中心で、研究寄り。
* [The Batch](https://www.deeplearning.ai/the-batch/)
  * Andrew Ng の DeepLearning.AI が運営する週刊ニュースレター。
  * 業界ニュースの要約と Ng 氏の所感が中心で、実運用寄り。
* [Interconnects](https://www.interconnects.ai/)
  * Nathan Lambert が書くニュースレター。
  * 事後学習、RLHF、オープンモデルの動向の解説が中心で、研究寄り。
* [Latent Space](https://latent.space/)
  * swyx、Alessio Fanelli の 2 人が運営するニュースレター兼ポッドキャスト。
  * AI エンジニアリングの実践者へのインタビューが中心で、実運用寄り。
* [Simon Willison's Weblog](https://simonwillison.net/)
  * Simon Willison の個人ブログ。
  * モデルと API の試用記録、LLM ツールの開発記録が毎日近く更新され、実運用寄り。
* [Andrej Karpathy blog](https://karpathy.bearblog.dev/)
  * Andrej Karpathy の個人ブログ。長文は旧ブログの [karpathy.github.io](https://karpathy.github.io/) に置く。
  * LLM の 1 年の振り返り、microgpt のような最小実装の解説が中心で、理論寄り。
* [Lil'Log](https://lilianweng.github.io/)
  * Lilian Weng の個人ブログ。
  * 強化学習、拡散モデル、エージェントなどの手法を網羅的に解説する長文記事で、理論寄り。
* [Ahead of AI](https://magazine.sebastianraschka.com/)
  * Sebastian Raschka のニュースレター。
  * 論文の読み解きと LLM の構造の比較が中心で、理論・研究寄り。
* [Don't Worry About the Vase](https://thezvi.substack.com/)
  * Zvi Mowshowitz が個人で書くブログ。
  * 週刊の AI 動向まとめが中心で、研究・政策の話が多い。
* [Hugging Face Papers](https://huggingface.co/papers)
  * Hugging Face が運営する日次の論文一覧。2025年7月に閉鎖された Papers with Code の受け皿でもある[^pwc-shutdown]。
  * arXiv の新着論文から注目度の高いものが並び、研究寄り。
* [alphaXiv](https://www.alphaxiv.org/)
  * Stanford 発のチームが運営する arXiv 論文の議論サイト。
  * 論文ごとのコメントと要約が付き、研究寄り。
* [arXiv cs.CL 新着](https://arxiv.org/list/cs.CL/recent)、[cs.AI 新着](https://arxiv.org/list/cs.AI/recent)
  * Cornell University が運営するプレプリントサーバの新着一覧。
  * 一次情報の論文そのもので、研究寄り。
* [LMArena](https://lmarena.ai/)
  * UC Berkeley 発の LMArena が運営する、人間の投票によるモデル比較のリーダーボード。
  * モデルの相対評価が中心で、実運用寄り。
* [Artificial Analysis](https://artificialanalysis.ai/)
  * 独立のベンチマーク企業 Artificial Analysis が運営する。
  * モデルと API 提供者の品質、速度、価格の比較が中心で、実運用寄り。
* [Epoch AI](https://epoch.ai/)
  * 非営利の研究機関 Epoch AI が運営する。
  * 計算量、学習データ、ハードウェアの推移の統計が中心で、研究寄り。
* [METR](https://metr.org/)
  * 非営利の評価機関 METR が運営する。
  * AI が自律的にこなせる作業時間の計測など、能力評価の研究が中心で、研究寄り。
* [Stanford AI Index](https://hai.stanford.edu/ai-index)
  * Stanford HAI が運営する年次報告。
  * 研究、産業、政策の統計をまとめた報告書で、研究寄り。
* [BAIR Blog](https://bair.berkeley.edu/blog/)
  * UC Berkeley の AI 研究所が運営する。
  * 所属研究者による自身の論文の解説が中心で、研究寄り。
* [SemiAnalysis](https://semianalysis.com/)
  * Dylan Patel が率いる半導体の調査会社が運営する。記事の多くは有料。
  * GPU、データセンター、学習基盤の供給と費用の分析が中心で、実運用寄り。

## 企業の技術ブログ

### 日本語

* [GMO Flatt Security Blog](https://blog.flatt.tech/)
  * GMO Flatt Security が運営する。
  * 公開された脆弱性やサプライチェーン攻撃の概要、対策をその週のうちに書く記事が多く、実運用寄り。
* [Takumi byGMO リリースノート](https://shisho.dev/docs/ja/r/)
  * GMO Flatt Security の AI ペネトレーションテスト製品 Takumi のリリースノート。
  * AI による診断機能の変更点が週に数件出ており、実運用寄り。
* [Preferred Networks テクノロジーブログ](https://www.preferred.jp/ja/blog/tech)
  * Preferred Networks が運営する。
  * 自社の LLM の学習、評価ベンチマーク、科学計算への応用の話が多く、研究寄り。
* [SB Intuitions Tech Blog](https://www.sbintuitions.co.jp/blog/)
  * SB Intuitions が運営する。
  * 日本語 LLM Sarashina の学習と評価、画像・動画生成の研究が中心で、研究寄り。
* [ELYZA Tech Blog](https://zenn.dev/p/elyza)
  * 日本語 LLM を開発する ELYZA が Zenn で運営する。
  * 日本語 LLM の学習と評価の話が多く、研究寄り。
* [Stockmark Tech Blog](https://stockmark-tech.hatenablog.com/)
  * ストックマークが運営する。
  * 文書読解モデルの学習、LLM-as-a-Judge の評価、エージェント開発の話が多く、研究・実運用が半々。
* [ABEJA Tech Blog](https://tech-blog.abeja.asia/)
  * ABEJA が運営する。
  * LLM の追加学習、ロボットへの VLM の応用、学会参加報告が多く、研究・実運用が半々。
* [Turing Tech Blog](https://zenn.dev/p/turing_motors)
  * 自動運転のチューリングが Zenn で運営する。
  * 視覚言語モデルの学習と車載への適用の話が多く、研究寄り。
* [LayerX エンジニアブログ](https://tech.layerx.co.jp/)
  * LayerX が運営する。
  * 社内のコーディングエージェントや AI を組み込んだ開発体制の話が多く、実運用寄り。
* [CyberAgent Developers Blog](https://developers.cyberagent.co.jp/blog/)
  * サイバーエージェントが運営する。
  * 自社 LLM の開発と広告事業への応用の話が多く、研究・実運用が半々。
* [LINEヤフー Tech Blog](https://techblog.lycorp.co.jp/ja)
  * LINEヤフーが運営する。
  * 大規模サービスでの LLM 活用と検索・推薦の話が多く、実運用寄り。
* [DeNA Engineering Blog](https://engineering.dena.com/blog/)
  * DeNA が運営する。
  * ゲームやライブ配信での AI 活用と Kaggle の話が多く、実運用寄り。
* [DevelopersIO](https://dev.classmethod.jp/)
  * クラスメソッドが運営する。
  * Amazon Bedrock などクラウドの AI サービスを試した手順の記録が多く、実運用寄り。

### それ以外の言語

* [Cursor Blog](https://cursor.com/blog)
  * Cursor が運営する。
  * コーディングエージェントの機能と内部の仕組みの話が多く、実運用寄り。
* [Cloudflare Blog（AI）](https://blog.cloudflare.com/tag/ai/)
  * Cloudflare が運営する。顧客事例の記事も混ざる。
  * 推論コストの削減、AI エージェント向けの基盤など自社で運用した話が多く、実運用寄り。
* [Vercel Blog](https://vercel.com/blog)
  * Vercel が運営する。
  * AI SDK とエージェントの構築の話が多く、実運用寄り。
* [AWS Machine Learning Blog](https://aws.amazon.com/blogs/machine-learning/)
  * AWS が運営する。
  * Bedrock や SageMaker を使った構築手順が多く、実運用寄り。
* [Meta Engineering（AI Research）](https://engineering.fb.com/category/ai-research/)
  * Meta のエンジニアリング組織が運営する。
  * 大規模な学習基盤と推論の最適化の話が多く、実運用寄り。
* [Uber Engineering（AI）](https://www.uber.com/blog/engineering/ai/)
  * Uber が運営する。
  * 需要予測や LLM の社内活用の話が多く、実運用寄り。

[^karpathy-anthropic]: [OpenAI co-founder Andrej Karpathy joins Anthropic's pre-training team](https://techcrunch.com/2026/05/19/openai-co-founder-andrej-karpathy-joins-anthropics-pre-training-team/)。TechCrunch、2026年5月19日。
[^pwc-shutdown]: [Papers with Code 公式リポジトリ](https://github.com/paperswithcode/paperswithcode-data)。2025年7月の閉鎖後、URL は Hugging Face Papers に転送される。
