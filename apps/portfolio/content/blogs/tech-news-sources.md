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

* [Google Cloud Japan（Zenn）](https://zenn.dev/p/google_cloud_jp)
  * Google Cloud の日本のエンジニアが書く公式 Publication。
  * Spanner や Cloud Run の仕組みを計測しながら解説する記事が多く、実運用寄り。

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

* [Kimi 研究博客](https://www.kimi.com/blog/)
  * Kimi を開発する Moonshot AI（月之暗面）の研究ブログ。中国語で、英語版は Hugging Face のモデルカードに出る。
  * Kimi K3.1 Pro など各モデルの技術ブログ、学習手法、ベンチマークの解説が中心で、研究寄り。
* [Qwen Research](https://qwen.ai/research)
  * Alibaba Cloud の Qwen チームが運営する公式サイトの研究ページ。
  * Qwen の各モデルの公開告知、アーキテクチャの解説が中心で、研究寄り。
* [Apple Machine Learning Research](https://machinelearning.apple.com/)
  * Apple の機械学習研究の公式サイト。
  * 端末上の LLM 推論、分散推論などの論文紹介が多く、研究寄り。
* [Amazon Science Blog](https://www.amazon.science/blog)
  * Amazon の研究部門の公式ブログ。
  * 自社サービスに入った研究成果の解説が中心で、研究・実運用が半々。
* [OpenAI Alignment Research Blog](https://alignment.openai.com/)
  * OpenAI のアラインメント研究チームの公式ブログ。
  * 安全性に関わる学習手法、評価指標の研究記事が多く、研究寄り。
* [vLLM Blog](https://blog.vllm.ai/)
  * 推論エンジン vLLM の開発チームが運営する公式ブログ。
  * 新しいオープンモデルを公開初日に動かすための最適化、推論性能の計測が多く、実運用寄り。
* [PyTorch Blog](https://pytorch.org/blog/)
  * PyTorch Foundation の公式ブログ。
  * 分散学習ライブラリの更新、性能改善の解説が多く、実運用寄り。
* [AMD ROCm Blogs](https://rocm.blogs.amd.com/)
  * AMD の GPU 向けソフトウェア ROCm の公式ブログ。
  * AMD GPU 上での学習・推論の最適化手順が多く、実運用寄り。
* [Model Context Protocol Blog](https://blog.modelcontextprotocol.io/)
  * MCP の仕様を管理する団体の公式ブログ。
  * 仕様の改訂、今後の計画、公式 SDK の告知が中心で、実運用寄り。

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
* [布留川英一（npaka）](https://x.com/npaka123)
  * プログラマーで技術書の著者。
  * 新しいモデルやツールを公開当日に試した記録が多く、実運用寄り。
* [きしだなおき](https://x.com/kis)
  * 『プロになるJava』共著者。ブログ「きしだのHatena」の筆者。
  * 公開直後のオープンモデルを手元で動かした所感、Java と LLM の話が多く、実運用寄り。
* [mizchi](https://x.com/mizchi)
  * フロントエンドのパフォーマンス改善を請け負うエンジニア。
  * 自分の AI プログラミング手法の更新、コーディングエージェントの使い方の検証が多く、実運用寄り。
* [laiso](https://x.com/laiso)
  * 『作って学ぶAIエージェント』の著者。
  * エージェントハーネスの設計、判定用の小型モデルの比較など自分で試した話が多く、実運用寄り。
* [からあげ](https://x.com/karaage0703)
  * ブログ「karaage.」の筆者。
  * ローカル LLM や DGX Spark、ロボットを自宅で動かした記録が多く、実運用寄り。
* [石原祥太郎（u++）](https://x.com/upura)
  * Google Cloud Japan の Developer Advocate。Kaggle Grandmaster。
  * 自身の論文、日本語データセット、Kaggle の話が多く、研究寄り。
* [Odashi](https://x.com/odashi_t)
  * LLM-jp で日本語 LLM の構築に携わる研究者。
  * LLM の学習の実務と評価の話を一次情報に基づいて書くことが多く、研究寄り。
* [横井祥](https://x.com/sho_yokoi)
  * 東北大学の自然言語処理の研究者。
  * 言語の統計的・幾何的構造の研究、論文の読み解きが多く、理論寄り。
* [暦本純一](https://x.com/rkmt)
  * Sony CSL の Senior Fellow で、東京大学の名誉教授。HCI と人間拡張の研究者。
  * AI と人間の関係に関する研究の紹介と自身の実験が多く、研究寄り。
* [ばんくし](https://x.com/vaaaaanquish)
  * エムスリーの VPoE、Google Developer Experts（AI/ML）。
  * 機械学習システムの運用と AI 開発組織の実務の話が多く、実運用寄り。
* [bbz](https://x.com/bbz662)
  * フロントエンド・バックエンド・SRE を手がけるエンジニア。
  * LLM をアプリケーションに組み込んで試した結果の共有が多く、実運用寄り。
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

* [V](https://voluntas.ghost.io/)
  * 時雨堂の代表 V 氏の個人ブログ。
  * コーディングエージェントのハーネスを乗り換えたり fork して使ったりした記録、Erlang まわりの開発の話が多く、実運用寄り。
* [逆瀬川ちゃんのほーむぺーじ](https://nyosegawa.com/)
  * 音声モデルの推論エンジン speech.cpp の作者、逆瀬川氏の個人サイト。
  * 自作エンジンのリリースノート、新しい API を手元で検証した結果が多く、実運用寄り。
* [uepon日々の備忘録](https://uepon.hatenadiary.com/)
  * uepon 氏の個人ブログ。
  * GPU の情報取得や文字化けの診断など、困ったことを小さなツールを自作して解決した記録が多く、実運用寄り。
* [じゃあ、おうちで学べる](https://syu-m-5151.hatenablog.com/)
  * スリーシェイクの SRE、nwiizo 氏の個人ブログ。
  * Rust、SRE、AI を使った開発を長文で掘り下げる記事が多く、理論・実運用寄り。
* [ｼﾞｮｲｼﾞｮｲｼﾞｮｲ](https://joisino.hatenablog.com/)
  * 『深層ニューラルネットワークの高速化』などの著者、佐藤竜馬氏の個人ブログ。
  * LLM の推論の仕組みや内部表現を論文を踏まえて解説する記事が中心で、研究寄り。
* [A Robot's Sigh](https://kaityo256.github.io/)
  * 慶應義塾大学の渡辺宙志氏の個人サイト。
  * MN-Core SDK を触った記録、AI を使ってゲームを作った過程などが多く、実運用寄り。
* [渋谷駅前で働くデータサイエンティストのブログ](https://tjo.hatenablog.com/)
  * データサイエンティスト TJO 氏の個人ブログ。
  * 統計学、機械学習の手法を数式と実験で確かめる記事が中心で、理論寄り。
* [たぬ（note）](https://note.com/tank_ai)
  * たぬ氏の個人 note。
  * LLM の審査の偏りを 2 万回の試行で測るなど、自分で実験して数字を出す記事が多く、実運用寄り。
* [葦沢かもめ（note）](https://note.com/ashizawakamome)
  * 小説家で慶應 SF センター研究員の葦沢かもめ氏の個人 note。
  * Claude や Blender MCP で作品を作った過程の記録が多く、実運用寄り。

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

* [seangoedecke.com](https://seangoedecke.com/)
  * GitHub のスタッフエンジニア Sean Goedecke の個人ブログ。
  * エージェントで開発する現場の実感、大企業でのソフトウェア開発の力学の話が多く、実運用寄り。
* [Geoffrey Huntley](https://ghuntley.com/)
  * オーストラリアのソフトウェアエンジニア Geoffrey Huntley の個人ブログ。
  * コーディングエージェントの使い方を試して書く「state of agentic coding」の連載が中心で、実運用寄り。
* [Drew Breunig](https://www.dbreunig.com/)
  * Overture Maps Foundation の Drew Breunig の個人ブログ。
  * コンテキストエンジニアリングの整理、エージェントの振る舞いの観察が多く、実運用寄り。
* [Dan Luu](https://danluu.com/)
  * Dan Luu の個人ブログ。
  * エージェントがテストをどう使うかなど、データを集めて長文で検証する記事が中心で、実運用寄り。
* [AddyOsmani.com](https://addyosmani.com/blog/)
  * Google Chrome チームの Addy Osmani の個人ブログ。
  * 既存コードベースでのエージェント活用、エージェント設定ファイルの監査などの話が多く、実運用寄り。
* [Steve Yegge](https://yegge.ai/)
  * 元 Google、元 Sourcegraph の Steve Yegge の個人サイト。
  * エージェント時代の開発体制についての長文エッセイが中心で、実運用寄り。
* [What's new](https://terrytao.wordpress.com/)
  * 数学者 Terence Tao の個人ブログ。
  * 数学研究に AI を使う試み、AI が出した証明の検証の話が増えており、研究寄り。
* [Shtetl-Optimized](https://scottaaronson.blog/)
  * 計算機科学者 Scott Aaronson の個人ブログ。
  * 量子計算に加え、AI アラインメント理論の講義資料や所感が多く、理論寄り。
* [ploeh blog](https://blog.ploeh.dk/)
  * Mark Seemann の個人ブログ。
  * AI が生成したコードをリリースする判断、ソフトウェア設計の話が多く、実運用寄り。
* [Hamel's Blog](https://hamel.dev/)
  * 機械学習エンジニア Hamel Husain の個人ブログ。
  * LLM アプリケーションの評価（evals）の設計手順が中心で、実運用寄り。
* [Deep (Learning) Focus](https://cameronrwolfe.substack.com/)
  * Netflix の Cameron Wolfe が書くニュースレター。
  * LLM の強化学習、エージェント評価などの手法を論文を追って長文で解説する記事が中心で、理論寄り。
* [philschmid.de](https://www.philschmid.de/)
  * Google DeepMind の Philipp Schmid の個人ブログ。
  * Gemini の新機能を公開直後に動かす手順が多く、実運用寄り。
* [Giles' blog](https://www.gilesthomas.com/)
  * Giles Thomas の個人ブログ。
  * LLM を自分で実装しながら学んだことを数式と実験で確かめる連載が中心で、理論寄り。
* [Metadata](https://muratbuffalo.blogspot.com/)
  * 分散システム研究者 Murat Demirbas の個人ブログ。
  * 論文の読書メモ、学会の参加記、AI 研究所の主張の検討が多く、研究寄り。
* [Irrational Exuberance](https://lethain.com/)
  * Will Larson の個人ブログ。
  * エンジニアリング組織の運営、AI 導入の戦略の話が多く、実運用寄り。
* [The Pragmatic Engineer](https://newsletter.pragmaticengineer.com/)
  * Gergely Orosz が書くニュースレター。
  * 大手テック企業の開発現場の調査記事が中心で、実運用寄り。
* [Tidy First?](https://tidyfirst.substack.com/)
  * Kent Beck が書くニュースレター。
  * ソフトウェア設計、AI と組んだ開発の進め方の話が多く、実運用寄り。
* [Mitchell Hashimoto](https://mitchellh.com/)
  * HashiCorp 共同創業者で Ghostty 作者の Mitchell Hashimoto の個人サイト。
  * ターミナルや低レイヤーの実装、AI を使った開発の進め方の話が多く、実運用寄り。
* [Armin Ronacher's Thoughts and Writings](https://lucumr.pocoo.org/)
  * Flask 作者 Armin Ronacher の個人ブログ。
  * エージェントの設計、Rust の話が多く、実運用寄り。
* [Vicki Boykis](https://vickiboykis.com/)
  * 機械学習エンジニア Vicki Boykis の個人ブログ。
  * 機械学習の学び方、ソフトウェアの書き方の話が多く、実運用寄り。
* [One Useful Thing](https://www.oneusefulthing.org/)
  * Wharton School の Ethan Mollick が書くニュースレター。
  * AI の能力の進み方を図表で追い、仕事での使い方を論じる記事が中心で、実運用寄り。
* [Max Woolf's Blog](https://minimaxir.com/)
  * データサイエンティスト Max Woolf の個人ブログ。
  * LLM に変わった条件を与えて挙動を調べる実験記事が多く、実運用寄り。
* [Joe Barrow](https://jbarrow.ai/)
  * Joe Barrow の個人ブログ。
  * 投機的デコーディング、方針蒸留などの仕組みをゼロから説明する記事が中心で、理論寄り。
* [Dwarkesh Podcast](https://www.dwarkesh.com/)
  * Dwarkesh Patel が運営するポッドキャスト。
  * AI 研究者への長時間のインタビューが中心で、研究寄り。
* [TheSequence](https://thesequence.substack.com/)
  * Jesus Rodriguez が書くニュースレター。
  * 論文の要約、エージェント技術の解説が週に数回出ており、研究寄り。
* [Last Week in AI](https://lastweekin.ai/)
  * Andrey Kurenkov らが運営する週刊ニュースレターとポッドキャスト。
  * 1 週間の研究、製品、政策のニュースの要約が中心で、研究・実運用が半々。
* [ThursdAI](https://sub.thursdai.news/)
  * Weights & Biases の Alex Volkov が運営する週刊ニュースレターとポッドキャスト。
  * その週のモデル公開、ツールの更新の要約が中心で、実運用寄り。
* [AlphaSignal](https://alphasignal.ai/)
  * Lior Alexander が運営する日刊ニュースレター。
  * モデル、ライブラリ、論文の更新を短く並べる形式で、研究・実運用が半々。
* [AI Newsletter（Elvis Saravia）](https://nlp.elvissaravia.com/)
  * DAIR.AI の Elvis Saravia が書くニュースレター。
  * 週ごとの注目論文、エージェントの動向の要約が中心で、研究寄り。
* [AI as Normal Technology](https://www.normaltech.ai/)
  * Princeton 大学の Arvind Narayanan、Sayash Kapoor が書くニュースレター。『AI Snake Oil』の著者。
  * エージェント評価の実態、AI の誇張への反証が中心で、研究寄り。
* [Redwood Research blog](https://blog.redwoodresearch.org/)
  * AI の安全性を研究する非営利団体 Redwood Research のブログ。
  * AI コントロールの評価、監視のレッドチームの研究記事が中心で、研究寄り。

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

* [ZOZO TECH BLOG](https://techblog.zozo.com/)
  * ZOZO が運営する。
  * PR の自動レビューや負荷試験を AI に任せる設計を、守られない指示を前提に組んだ話が多く、実運用寄り。
* [NTT Communications Engineers' Blog](https://engineers.ntt.com/)
  * NTT コミュニケーションズが運営する。
  * Claude Code のサブエージェントのコスト実測、ネットワーク運用への AI 適用など計測を伴う記事が多く、実運用寄り。
* [Timee Product Team Blog](https://tech.timee.co.jp/)
  * タイミーが運営する。
  * LLM によるコンテンツモデレーションの評価・改善ループ、推薦システムの自動改善の設計が多く、実運用寄り。
* [MonotaRO Tech Blog](https://tech-blog.monotaro.com/)
  * モノタロウが運営する。
  * AI 駆動開発で社内ツールや認証基盤を作り替えた経過が多く、実運用寄り。
* [Uzabase Tech Blog](https://tech.uzabase.com/)
  * ユーザベースが運営する。
  * AI エージェントのオンライン評価、AI 主導で育てたモックライブラリなど開発現場の話が多く、実運用寄り。
* [Findy Tech Blog](https://tech.findy.co.jp/)
  * ファインディが運営する。
  * 施策立案から QA までを AI エージェントで回す開発フローの構成が多く、実運用寄り。
* [CADDi Tech Blog](https://caddi.tech/)
  * キャディが運営する。
  * Agent Skills による機械学習開発の生産性改善、ECCV や MIRU の参加報告が多く、研究・実運用が半々。
* [エムスリーテックブログ](https://www.m3tech.blog/)
  * エムスリーが運営する。
  * Claude が実装した E2E テストのレビューツールなど、AI を使う開発の工夫が多く、実運用寄り。

* [RAKUS Developers Blog](https://tech-blog.rakus.co.jp/)
  * ラクスが運営する。
  * 自律的な AI ループで開発プロセスを回す設計、運用の知見を AI で引く仕組みの話が多く、実運用寄り。
* [豆蔵デベロッパーサイト](https://developer.mamezou-tech.com/)
  * 豆蔵が運営する。
  * アジャイルの FAQ、AI を使った開発ツールの更新記録など、長期の連載が多く、実運用寄り。
* [every Tech Blog](https://tech.every.tv/)
  * DELISH KITCHEN のエブリーが運営する。
  * Claude Code のハーネスを MCP と CLI のどちらで作るかなど、社内で試した判断が多く、実運用寄り。
* [Algomatic Tech Blog](https://tech.algomatic.jp/)
  * Algomatic が運営する。
  * AI に任せる範囲の決め方、AI が作った UI のレビュー手順の話が多く、実運用寄り。
* [Insight Edge Tech Blog](https://techblog.insightedge.jp/)
  * 住友商事グループの Insight Edge が運営する。
  * Claude Code の運用をハーネスで半自動化した話、データサイエンスの事例が多く、実運用寄り。
* [kickflow Tech Blog](https://tech.kickflow.co.jp/)
  * kickflow が運営する。
  * AI evals の失敗の分類、Claude Code のメモリ運用など、数か月使った上での記録が多く、実運用寄り。
* [Tabelog Tech Blog](https://tech-blog.tabelog.com/)
  * カカクコムの食べログ開発部門が運営する。
  * ハーネスエンジニアリング、AI での要件定義を実践した記録が多く、実運用寄り。
* [Pepabo Tech Portal](https://tech.pepabo.com/)
  * GMO ペパボが運営する。
  * テストの階層の見直し、AI に任せ切る仕組みの話が多く、実運用寄り。
* [Visional Engineering Blog](https://engineering.visional.inc/blog/)
  * ビズリーチのビジョナルが運営する。
  * 人材領域に特化した埋め込みモデルの構築など、学会発表の内容が多く、研究・実運用が半々。
* [KAKEHASHI Tech Blog](https://kakehashi-dev.hatenablog.com/)
  * カケハシが運営する。
  * 薬剤師がプロンプトを育てた過程、品質管理の組織の話が多く、実運用寄り。
* [弥生開発者ブログ](https://tech-blog.yayoi-kk.co.jp/)
  * 弥生が運営する。
  * デザインシステムを Agent Skills にした結果、アラートの初動調査を AI に任せた話が多く、実運用寄り。
* [G-gen Tech Blog](https://blog.g-gen.co.jp/)
  * Google Cloud 専業の G-gen が運営する。
  * Google Cloud の各サービスの仕組みと設定手順の記事がほぼ毎日出ており、実運用寄り。
* [TechRacho](https://techracho.bpsinc.jp/)
  * BPS が運営する。
  * Ruby、Rails の更新情報、海外記事の翻訳が多く、実運用寄り。
* [VA Linux エンジニアブログ](https://www.valinux.co.jp/blog/)
  * VA Linux Systems Japan が運営する。
  * Linux カーネルの解読、vLLM と RDMA でローカル LLM クラスタを組む連載が中心で、理論・実運用寄り。
* [Taste of Tech Topics](https://acro-engineer.hatenablog.com/)
  * Acroquest Technology が運営する。
  * AWS の AI サービスを触って制約やコストを確かめる記事が多く、実運用寄り。
* [赤帽エンジニアブログ](https://rheb.hatenablog.com/)
  * レッドハットの日本法人が運営する。
  * OpenShift AI、API セキュリティの解説が多く、実運用寄り。
* [Wantedly Engineer Blog](https://www.wantedly.com/stories/s/wantedly_engineers)
  * ウォンテッドリーが運営する。
  * LLM が生成する文章の品質保証、推薦システムの学会参加記が多く、研究・実運用が半々。
* [松尾研究所テックブログ](https://zenn.dev/p/mkj)
  * 松尾研究所が運営する Zenn の Publication。
  * Agentic RL のタスク設計、表形式データの基盤モデルの検証が多く、研究寄り。
* [Japan Digital Design（note）](https://note.com/japan_d2)
  * 三菱 UFJ フィナンシャル・グループの Japan Digital Design が運営する。
  * 金融 AI の定点観測、LLM と RAG の評価基盤の検証が多く、実運用寄り。
* [GMO インターネットグループ 次世代システム研究室](https://recruit.group.gmo/engineer/jisedai/blog/)
  * GMO インターネットグループの研究開発部門が運営する。
  * DGX Spark 2 台でオープンモデルを動かす記録、Claude Code とカスタム lint を組み合わせた運用の話が多く、実運用寄り。

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
* [Shopify Engineering](https://shopify.engineering/)
  * Shopify が運営する。
  * AI エージェントにモバイル開発環境を渡す話、オープンモデルをタスク特化に仕立てる話が多く、実運用寄り。
* [Pinterest Engineering](https://medium.com/pinterest-engineering)
  * Pinterest が運営する。
  * PyTorch モジュールの可視化、エージェント向けのメトリクス層など ML 基盤の話が多く、実運用寄り。
* [Airbnb Engineering](https://medium.com/airbnb-engineering)
  * Airbnb が運営する。
  * 自然言語検索の学習、本番トラフィックの再生テストなど検索・ML の話が多く、実運用寄り。
* [Spotify Engineering](https://engineering.atspotify.com/)
  * Spotify が運営する。
  * 生成型推薦の推論、AI が開発の進め方を変えた話、A/B テストの方針が多く、実運用寄り。
* [Netflix TechBlog](https://netflixtechblog.com/)
  * Netflix が運営する。
  * 推薦、オブザーバビリティ、コンテナ基盤など大規模サービスの内部の話が多く、実運用寄り。
* [Fly.io Blog](https://fly.io/blog/)
  * Fly.io が運営する。
  * エージェントに計算機を渡す仕組み、MCP サーバー、ファイルシステムの話が多く、実運用寄り。
* [Sourcegraph Blog](https://sourcegraph.com/blog)
  * Sourcegraph が運営する。
  * 脆弱性の箇所をコードベースから探す話、コーディングエージェントの設計が多く、実運用寄り。
* [JetBrains AI Blog](https://blog.jetbrains.com/ai/)
  * JetBrains が運営する。
  * コーディング向けオープンモデル Mellum の学習、エージェントの統制の話が多く、実運用寄り。
* [The GitHub Blog](https://github.blog/)
  * GitHub が運営する。
  * Copilot、エージェント向けの Git 基盤の話が多く、実運用寄り。
* [Microsoft for Developers](https://devblogs.microsoft.com/)
  * Microsoft の開発部門が運営する。
  * エージェント開発、.NET、VS Code の更新情報が多く、実運用寄り。
* [Cognition Blog](https://www.cognition.ai/blog)
  * Devin を開発する Cognition が運営する。
  * エージェントに本番の障害対応やコスト管理を任せた話が多く、実運用寄り。
* [Ollama Blog](https://ollama.com/blog)
  * Ollama が運営する。
  * ローカルで動かせる新しいモデルの対応告知が中心で、実運用寄り。
* [Databricks Research](https://www.databricks.com/blog/category/research)
  * Databricks の研究部門（元 MosaicML）が運営する。
  * エージェントの記憶の設計、学習の効率化の研究記事が中心で、研究寄り。
* [Strands Agents Blog](https://strandsagents.com/blog/)
  * AWS が開発するエージェント SDK、Strands Agents の公式ブログ。
  * 構造化出力の評価、数万回の試行で測った判定コストの話が多く、実運用寄り。
* [Stripe Dot Dev Blog](https://stripe.dev/blog)
  * Stripe の開発者向けブログ。
  * エージェントが決済を扱うための設計、不正検知での機械学習の話が多く、実運用寄り。
* [Dropbox Tech Blog](https://dropbox.tech/)
  * Dropbox が運営する。
  * 自社製品への AI 機能の組み込みの話が多く、実運用寄り。
* [exe.dev blog](https://blog.exe.dev/)
  * クラウド開発環境 exe.dev のチームが運営する。
  * エージェントのループの構造、エージェントに与える権限の絞り方の話が中心で、実運用寄り。
* [turbopuffer Blog](https://turbopuffer.com/blog)
  * 検索データベース turbopuffer が運営する。
  * ベクトル検索の設計、埋め込みを DB 側で計算する判断の話が多く、実運用寄り。
* [JFrog Security Research](https://research.jfrog.com/)
  * JFrog のセキュリティ研究チームが運営する。
  * LLM 関連ライブラリのサプライチェーン攻撃、脆弱性の解析が多く、実運用寄り。

[^karpathy-anthropic]: [OpenAI co-founder Andrej Karpathy joins Anthropic's pre-training team](https://techcrunch.com/2026/05/19/openai-co-founder-andrej-karpathy-joins-anthropics-pre-training-team/)。TechCrunch、2026年5月19日。
[^pwc-shutdown]: [Papers with Code 公式リポジトリ](https://github.com/paperswithcode/paperswithcode-data)。2025年7月の閉鎖後、URL は Hugging Face Papers に転送される。
