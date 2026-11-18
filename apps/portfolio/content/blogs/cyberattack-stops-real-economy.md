---
title: "Capitalism will end in a chain of system outages"
description: "ALL.Net went down after unauthorized access, and I could not play games on my way home. Store staff are just an interface between the network and the real world, and one service going down stops even the stores of companies that were never attacked. Through the accumulation of outages like these, the day capitalism ends will surely come soon."
tags: ["セキュリティ", "サプライチェーン"]
published: true
---

The day will surely come soon when one service somewhere goes down, the other services go down one after another in a chain, and capitalism ends. Every system in this world is connected through networks, and store staff are just an interface between those networks and the real world. If what is on the other side of the network stops, nothing can be bought or sold, even when the store has its people, its goods and its machines in place. Unauthorized access tends to be seen as an incident where information leaks, but in reality it interferes directly with real economic activity.

In November 2026, ALL.Net, which supports online play at game arcades, went down after unauthorized access, and I could not play games on my way home. Its operator, SEGA FAVE, stopped various services from 15:00 on November 1, and as of 18:00 on November 2 it had stopped online play for ALL.Net titles, play using Aime, PrizeON, and even new SEGA ID registrations. The initial investigation found no leak of user or business partner information[^segafave-allnet][^denfaminico-allnet]. Even so, players of the Gundam EXVS series were told that even cabinets running offline were expected to become unplayable one after another[^exvs-offline]. A store manager also wrote on note that we now live in an era where you cannot play when the network stops even if the machines work fine, and that the problems stores can do nothing about have increased[^erina-note].

At a game arcade it ends at "too bad I couldn't play," but the same thing is already happening to the business of stores itself. In July 2026, the food logistics company Nichirei suffered unauthorized access, and KFC Japan announced that ingredients were not arriving and all its stores might close temporarily or stop selling. All stores returned to normal business on July 22[^impress-nichirei].

It is not only the party that was attacked that stops. When ASKUL was infected with ransomware in October 2025, MUJI and LOFT, which had outsourced their logistics to it, also stopped selling in their online stores. Ryohin Keikaku's own systems were not infected[^sakigake-askul]. In this ALL.Net incident too, Bandai Namco's Taiko no Tatsujin was caught up in it[^gamespark-allnet]. A dependency you do not even know about stops your real world.

The chain reaches even competitors with no business relationship. On September 29, 2025, Asahi Group was hit by ransomware, its order taking and shipping stopped, and many of its factories halted production. Shipments even stopped for convenience store private brands that were made by Asahi under contract, such as Seven-Eleven's chuhai "Clear Cooler" and FamilyMart's tea[^hokkaido-np-asahi-pb]. A month later there was still no prospect of recovery, and at the end of October Asahi Breweries was shipping only about 10% of its usual items[^sakigake-asahi]. Kirin, flooded with orders replacing Asahi's, limited shipments of beer for restaurants and bars and also stopped selling its year-end gift sets[^oanda-kirin]. Kirin, which had not been attacked, could not fill the hole left by Asahi and had to cut its supply.

A chain does not even need an attacker. In July 2024, a faulty update to CrowdStrike's security software stopped about 8.5 million Windows machines. That was less than 1% of all Windows machines[^techcrunch-crowdstrike], yet hospitals, airlines and banks around the world stopped working. In October 2025, AWS and Azure had large outages one after the other[^theregister-azure]. Because dependencies are concentrated on a small number of cloud providers, when one of those clouds goes down, the services running on it stop with it, no matter how carefully they were built.

::figure{name=cascade-failure}

These outages are spreading wider while the intervals between them shrink.

| Period         | What stopped                                                                               | What caused it                                            |
| -------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| July 2024      | About 8.5 million Windows machines worldwide                                               | A faulty security software update                         |
| September 2025 | Asahi's shipments, convenience store private brands, Kirin's beer for restaurants and bars | Ransomware at Asahi                                       |
| October 2025   | The online stores of MUJI and LOFT                                                         | Ransomware at ASKUL, their logistics contractor           |
| October 2025   | Services running on AWS and Azure                                                          | Cloud outages                                             |
| July 2026      | All KFC stores                                                                             | Unauthorized access at Nichirei, a food logistics company |
| November 2026  | ALL.Net titles at game arcades across the country                                          | Unauthorized access to ALL.Net                            |

Even within what I could find, after July 2024 there was a gap of more than a year, but since the autumn of 2025 they have been happening every few months. The scope of what stops has also widened, from the business partners of the attacked company, to competitors with no business relationship, to worldwide outages with no attacker at all. Meanwhile, systems keep moving toward being connected to each other, and dependencies keep moving toward a small number of providers.

The day capitalism ends is not a story of the distant future. Each outage recovers in days or months, makes the news, and is forgotten. But with each outage, the reach of the chain grows, and someday one outage somewhere will stop the economy before it recovers. That day will come soon, at the end of the accumulation of outages like these.

[^segafave-allnet]: [【重要】当社サーバーへの不正アクセスに関するお詫びとお知らせ](https://www.segafave.co.jp/news/261102_1/)（セガ フェイブ、2026年11月2日）

[^denfaminico-allnet]: [セガ フェイブが「ALL.Net」「Aime」サーバーへの不正アクセスを確認](https://news.denfaminicogamer.jp/news/2611022u)（電ファミニコゲーマー）

[^exvs-offline]: [【11月2日時点】イニブのオンラインが停止中・オフラインも順次停止へ](https://gundam-exvs.online/allnet-maintenance-exvs-online/) (a fan information site for the Gundam EXVS series)

[^erina-note]: [プレイハウスエリナの note](https://note.com/playhouse_erina/n/n7e458e48ef66)（2026年11月）

[^sakigake-askul]: [無印、ロフト、そごう西武も停止 アスクルへのサイバー攻撃で](https://www.sakigake.jp/news/article/20251019CO0076/)（秋田魁新報、2025年10月）

[^gamespark-allnet]: [『太鼓の達人』『ガンダムEXVS.』などに影響―不正アクセス対応でアーケード向けALL.NetとAimeの緊急メンテ続く](https://news.yahoo.co.jp/articles/1cbff9f9f84955934682dbc4387e27cb13c7906c)（Game Spark）

[^hokkaido-np-asahi-pb]: [北海道新聞の記事](https://www.hokkaido-np.co.jp/article/1221748/)（2025年10月）

[^sakigake-asahi]: [アサヒ障害1カ月復旧めど立たず ビール出荷品目1割に低迷](https://www.sakigake.jp/news/article/20251029CO0099/)（秋田魁新報、2025年10月29日）

[^oanda-kirin]: [キリン業務用出荷正常化へ](https://www.oanda.jp/lab-education/?p=105105), [キリン、歳暮商品全て販売停止へ](https://www.oanda.jp/lab-education/market_news/kn_2025111901001815/) (articles distributed by Kyodo News). Sapporo and Suntory also suspended sales of some of their year-end gift sets.

[^impress-nichirei]: [ネットショップ担当者フォーラムの記事](https://netshop.impress.co.jp/n/2026/07/22/16439)（2026年7月22日）

[^techcrunch-crowdstrike]: [Microsoft says 8.5M Windows devices were affected by CrowdStrike outage](https://techcrunch.com/2024/07/20/microsoft-says-8-5m-windows-devices-were-affected-by-crowdstrike-outage/) (TechCrunch, July 20, 2024)

[^theregister-azure]: [An article in The Register](https://theregister.com/2025/10/29/microsoft_azure_outage/) (October 29, 2025). AWS had an outage on October 20 caused by a DNS fault in DynamoDB in us-east-1, and Azure had one on October 29 caused by a configuration change to Azure Front Door.
