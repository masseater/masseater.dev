---
title: "資本主義はシステム停止の連鎖で終わる"
description: "ALL.Net が不正アクセスで止まり、帰りにゲームができなかった。店員はネットワークと現実をつなぐインターフェースにすぎず、1つのサービスの停止は攻撃を受けていない会社の店まで止める。こうした停止の積み重ねで、資本主義が終わる日は近いうちに必ずやってくる。"
tags: ["セキュリティ", "サプライチェーン"]
published: true
---

どこか1つのサービスが止まることで各サービスが連鎖的に止まり、資本主義が終わる日は近いうちに必ずやってくる。この世のあらゆるシステムはネットワーク経由でつながっていて、店員はそのネットワークと現実をつなぐインターフェースにすぎない。ネットワークの向こうが止まれば、店に人と商品と機械がそろっていても売り買いはできなくなる。不正アクセスは情報が漏れる事件として受け取られがちだが、実際には現実の経済活動に直接干渉している。

2026年11月、ゲームセンターのオンライン対戦を支える ALL.Net が不正アクセスで止まり、僕は帰りにゲームができなかった。運営元のセガ フェイブは11月1日15時から各種サービスを停止し、2日18時の時点では ALL.Net 対応タイトルのオンラインプレイ、Aime を使ったプレイ、PrizeON、SEGA ID の新規登録まで止めている。初期調査では、ユーザーや取引先の情報流出は確認されていない[^segafave-allnet][^denfaminico-allnet]。それでもガンダム EXVS シリーズでは、オフラインで動いている筐体まで順次遊べなくなる見込みだと案内された[^exvs-offline]。現場の店長も note で、機械が正常でもネットワークが止まれば遊べない時代になり、店舗側ではどうにもできない問題が増えたと書いている[^erina-note]。

ゲームセンターなら「遊べなくて残念」で済むが、同じことは会計の現場でもすでに起きている。2021年7月、スウェーデンの大手スーパー Coop では、レジとセルフレジが止まって店内で会計できなくなり、約800店舗を閉めた[^therecord-coop]。2026年7月には食品物流のニチレイが不正アクセスを受け、日本 KFC は食材が届かず全店舗で臨時休業や販売休止が起こりうると発表した。全店で通常営業に戻ったのは7月22日である[^impress-nichirei]。

止まるのは、攻撃を受けた当事者だけではない。Coop 自身は標的ではなく、決済システムを納めていた Visma EssCom が使う Kaseya のソフトウェアが侵入された結果だった[^therecord-coop]。2025年10月にアスクルがランサムウェアに感染したときは、物流を委託していた無印良品やロフトもネットストアでの販売を停止した。良品計画のシステムは感染していない[^sakigake-askul]。今回の ALL.Net でも、バンダイナムコの太鼓の達人が巻き添えになっている[^gamespark-allnet]。自分の知らない依存先が、自分の現実を止める。

連鎖は取引のない競合にまで届く。2025年9月29日にアサヒグループがランサムウェアの被害を受け、受注と出荷が止まって多くの工場が生産を停止した。セブン-イレブンの酎ハイ「クリアクーラー」やファミリーマートの紅茶のように、アサヒに製造を委託していたコンビニのプライベートブランドまで出荷が止まった[^hokkaido-np-asahi-pb]。1か月経っても復旧の目処は立たず、アサヒビールの出荷品目は10月末の時点で通常の約1割にとどまっていた[^sakigake-asahi]。アサヒの代わりの注文が殺到したキリンは業務用ビールの出荷を制限し、歳暮セットの販売も停止した[^oanda-kirin]。攻撃を受けていないキリンが、アサヒの穴を埋めきれずに供給を絞ったわけである。

連鎖を起こすのに、攻撃者すら要らない。2024年7月には、CrowdStrike のセキュリティソフトの更新の不具合で約850万台の Windows が止まった。全 Windows 機の1%未満にすぎないのに[^techcrunch-crowdstrike]、世界中で病院や航空会社や銀行の業務が止まった。2025年10月には AWS と Azure が相次いで大規模な障害を起こしている[^theregister-azure]。依存が少数のクラウド事業者に集まっているので、そのクラウドが落ちれば、その上で動くサービスはどれだけ丁寧に作られていても一緒に止まる。

こうした停止は、間隔が縮まりながら範囲を広げている。

| 時期       | 止まったもの                                      | 止まった原因                                   |
| ---------- | ------------------------------------------------- | ---------------------------------------------- |
| 2021年7月  | Coop の約800店舗のレジ                            | 決済システムの納入元が使うソフトウェアへの侵入 |
| 2024年7月  | 世界の約850万台の Windows                         | セキュリティソフトの更新の不具合               |
| 2025年9月  | アサヒの出荷、コンビニの PB、キリンの業務用ビール | アサヒへのランサムウェア                       |
| 2025年10月 | 無印良品とロフトのネットストア                    | 物流の委託先のアスクルへのランサムウェア       |
| 2025年10月 | AWS と Azure の上で動くサービス                   | クラウドの障害                                 |
| 2026年7月  | KFC の全店舗                                      | 食品物流のニチレイへの不正アクセス             |
| 2026年11月 | 全国のゲームセンターの ALL.Net 対応タイトル       | ALL.Net への不正アクセス                       |

僕が拾えた範囲だけでも、2021年と2024年の間は3年空いていたのに、2025年の秋からは数か月おきに起きている。止まる範囲も、攻撃を受けた会社の取引先から、取引のない競合へ、攻撃者のいない世界規模の停止へと広がった。その間にも、システムは互いにつながる方向へ、依存は少数の事業者に集まる方向へ進んでいる。

資本主義が終わる日は遠い未来の話ではない。1回ごとの停止は数日から数か月で復旧し、ニュースになっては忘れられていく。けれども停止のたびに連鎖の届く先は広がっていて、いつかどこか1つの停止が、復旧するより先に経済のほうを止める。それはこうした停止の積み重ねの先に、近いうちにやってくる。

[^segafave-allnet]: [【重要】当社サーバーへの不正アクセスに関するお詫びとお知らせ](https://www.segafave.co.jp/news/261102_1/)（セガ フェイブ、2026年11月2日）

[^denfaminico-allnet]: [セガ フェイブが「ALL.Net」「Aime」サーバーへの不正アクセスを確認](https://news.denfaminicogamer.jp/news/2611022u)（電ファミニコゲーマー）

[^exvs-offline]: [【11月2日時点】イニブのオンラインが停止中・オフラインも順次停止へ](https://gundam-exvs.online/allnet-maintenance-exvs-online/)（ガンダム EXVS シリーズのファンの情報サイト）

[^erina-note]: [プレイハウスエリナの note](https://note.com/playhouse_erina/n/n7e458e48ef66)（2026年11月）

[^therecord-coop]: [Supermarket chain Coop closes 800 stores following Kaseya ransomware attack](https://therecord.media/supermarket-chain-coop-closes-800-stores-following-kaseya-ransomware-attack/)（The Record、2021年7月）。閉めた店舗数は報道で揺れており、[BleepingComputer](https://www.bleepingcomputer.com/news/security/coop-supermarkets-closes-500-stores-after-kaseya-ransomware-attack/) は約500店舗、復旧を手伝った [Truesec](https://www.truesec.com/hub/blog/back-in-business-after-the-largest-ransomware-attack-of-all-time) は800店舗のうち約700店舗としている。

[^sakigake-askul]: [無印、ロフト、そごう西武も停止 アスクルへのサイバー攻撃で](https://www.sakigake.jp/news/article/20251019CO0076/)（秋田魁新報、2025年10月）

[^gamespark-allnet]: [『太鼓の達人』『ガンダムEXVS.』などに影響―不正アクセス対応でアーケード向けALL.NetとAimeの緊急メンテ続く](https://news.yahoo.co.jp/articles/1cbff9f9f84955934682dbc4387e27cb13c7906c)（Game Spark）

[^hokkaido-np-asahi-pb]: [北海道新聞の記事](https://www.hokkaido-np.co.jp/article/1221748/)（2025年10月）

[^sakigake-asahi]: [アサヒ障害1カ月復旧めど立たず ビール出荷品目1割に低迷](https://www.sakigake.jp/news/article/20251029CO0099/)（秋田魁新報、2025年10月29日）

[^oanda-kirin]: [キリン業務用出荷正常化へ](https://www.oanda.jp/lab-education/?p=105105)、[キリン、歳暮商品全て販売停止へ](https://www.oanda.jp/lab-education/market_news/kn_2025111901001815/)（共同通信の配信記事）。サッポロとサントリーも歳暮セットの一部の販売を休止した。

[^impress-nichirei]: [ネットショップ担当者フォーラムの記事](https://netshop.impress.co.jp/n/2026/07/22/16439)（2026年7月22日）

[^techcrunch-crowdstrike]: [Microsoft says 8.5M Windows devices were affected by CrowdStrike outage](https://techcrunch.com/2024/07/20/microsoft-says-8-5m-windows-devices-were-affected-by-crowdstrike-outage/)（TechCrunch、2024年7月20日）

[^theregister-azure]: [The Register の記事](https://theregister.com/2025/10/29/microsoft_azure_outage/)（2025年10月29日）。AWS は10月20日に us-east-1 の DynamoDB の DNS の不具合で、Azure は10月29日に Azure Front Door の設定変更で障害を起こした。
