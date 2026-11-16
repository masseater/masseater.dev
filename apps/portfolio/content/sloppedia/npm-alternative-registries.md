---
title: "npm の代替レジストリ"
description: "npm のクライアントがパッケージを入れられる、公開の npm レジストリ以外のレジストリ。プライベートなパッケージを置く、公開レジストリをキャッシュする、悪意のあるパッケージを止める、インストールを速めるといった目的で使う。2026年に pnpm のチームが pnpr を始めた。"
tags: ["パッケージレジストリ", "Node.js", "パッケージマネージャー", "2026年のソフトウェア"]
published: true
---

npm の代替レジストリは、公開の npm レジストリ（registry.npmjs.org）とは別のパッケージレジストリで、npm、pnpm、Yarn、Bun がパッケージを入れるのに使えるものである。多くは npm レジストリと同じ HTTP のプロトコルを話す。クライアントは `registry` の設定を変えるだけで使える。

プライベートなパッケージを置くものもある。社内で公開レジストリをキャッシュするものもある。悪意のあるパッケージが開発者へ届く前に止めるものもある。2026年には [pnpm](/sloppedia/pnpm) のチームが独自のレジストリサーバーである pnpr を始めた。レジストリの設計そのものが、インストールの速さと供給網のセキュリティを競う場になった。

## 背景

### 公開の npm レジストリ

公開の npm レジストリは、Microsoft の傘下にある GitHub が運営している。2025年9月、自己増殖するワームの Shai-Hulud が公開用のトークンを盗み、500以上のパッケージに悪意のあるバージョンを出した[^npm-plan]。その後、GitHub は公開の手続きを段階的に厳しくした。

| 日付          | 変更                                                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 2025年7月31日 | OIDC による Trusted Publishing が一般提供になった[^trusted-ga]                                                          |
| 2025年11月5日 | 新しいクラシックトークンを作れなくなった[^classic-disabled]                                                             |
| 2025年12月9日 | すべてのクラシックトークンが取り消され、`npm login` が2時間のセッショントークンを出すようになった[^classic-revoked]     |
| 2026年5月22日 | ステージドパブリッシング（`npm stage publish`）で、メンテナーが2FAで承認するまでバージョンを入れられなくなった[^staged] |
| 2027年1月     | 細粒度のトークンで直接公開する手段が終わる予定である[^tokens]                                                           |

代替レジストリもこれらの変更に追従している。Verdaccio 7 は、npm 11.17 以降を要するステージドパブリッシングを足した[^verdaccio-7]。悪意のあるパッケージを止めるレジストリも、同じ攻撃をきっかけに増えた。

### 別のレジストリを使う理由

別のレジストリを運用する理由は、次のうち1つか複数である。

- 社内のプライベートなパッケージを公開するため。
- 公開レジストリのキャッシュを持ち、公開レジストリが遅い、止まっている、届かないときもインストールできるようにするため。
- 悪意のあるバージョンや新しすぎるバージョンを、入れる前に止めるため。
- インストールを速めるため。
- TypeScript をそのまま公開するなど、別のパッケージのモデルを使うため。

## 種類

### セルフホストのサーバー

自分の機械やクラウドのアカウントで動かす。たいていは公開レジストリをプロキシし、その隣にプライベートなパッケージを置く。

#### pnpr

[pnpr](/sloppedia/pnpr) は、pnpm のチームが Rust で書いたレジストリサーバーである[^pnpr]。ドキュメントは、JavaScript のエコシステムで Verdaccio が担う役割に近いと書いている[^pnpr]。最初のビルドは2026年5月26日に `@pnpm/pnpr` として npm に公開された[^pnpr-npm]。2026年11月15日の時点ではすべてのバージョンがプレリリースで、最新は2026年11月13日の `0.1.0-alpha.20` である[^pnpr-npm]。ドキュメントは実験的なものとしている[^pnpr]。

ほかのレジストリサーバーとは4つの点で違う。

- クライアントの代わりに依存を解決する。`pnprServer` を設定すると、pnpm は手元で解決せず、マニフェストを pnpr に送る。pnpr はロックファイルをストリームで返し、pnpm はそのあと tarball を並列に取得する[^pnpr-accel]。省けるのはダウンロードではなく、依存の木の階層ごとの往復である。
- 1つのインスタンスが npm 以外も扱う。`0.1.0-alpha.11` からは、Cargo、Python（PyPI）、コンテナイメージ（OCI）のレジストリも提供する[^pnpr-ecosystems]。
- 各パッケージ名は、ちょうど1つのレジストリに属する。ルーターはあるオリジンから別のオリジンへ落ちて探さない。ドキュメントによれば、これで依存関係の混同攻撃を防ぐ[^pnpr-config]。
- オープンソースではない。pnpr は PolyForm Shield License 1.0.0 を使い、ライセンサーは Zoltan Kochan である[^pnpr-license]。競合する製品を提供する目的を除けば、どの目的でも動かし、変えられる。pnpm のモノレポの中で、MIT License でない唯一の部分である。

メタデータは既定で SQLite に置く。libSQL（Turso）、PostgreSQL、MySQL も使え、アーカイブは Cloudflare R2 などの S3 互換のストレージに置ける[^pnpr-storage]。pnpr は Cloudflare の上でも動くが、Worker そのものではなく、Worker の背後の Cloudflare Containers として動く。ドキュメントは、コールドスタートに20〜60秒かかると注意している[^pnpr-cloudflare]。

2026年10月31日から11月2日にかけて、pnpm のチームは pnpr 向けの一連の RFC をマージした[^pnpr-rfcs]。SQL によるメタデータの格納、公開時のマニフェストの検証、ワークスペース全体のアトミックな公開、packument の分割、プラットフォームごとの変種を扱う。検証できるリリースの記録も含む。これは各公開を C2SP のタイル化された透明性ログに記録し、in-toto のステートメントとして署名する[^pnpr-rfcs]。pnpm と pnpr は足並みをそろえて変わる。2026年11月12日に出た pnpm 12.20.0 は、リモートでの解決に pnpr `0.1.0-alpha.20` 以降を要する[^pnpm-blog]。

#### Verdaccio

[Verdaccio](/sloppedia/verdaccio) は、Node.js で書かれたプライベートなプロキシレジストリである[^verdaccio]。2016年4月に、開発の止まった Sinopia のフォークとして始まった[^verdaccio-story]。MIT License で無料で提供され、自分で運用する[^verdaccio]。

Verdaccio 7.0.0 は2026年10月25日に、7.1.0 は2026年11月8日に出た[^verdaccio-releases]。7 は Node.js 24 以降を要し、Express 5 に移った[^verdaccio-7]。純粋な ESM のプラグインに対応し、ストレージの API は Promise を返すようになった。実験的なステージドパブリッシングと、ワンタイムパスワードによる二要素認証も足した[^verdaccio-7]。

#### vsr

vsr は、npm の元の開発者たちの会社である [vlt](/sloppedia/vlt) が作った npm 互換のレジストリである[^vsr]。Cloudflare Workers と D1・R2 の上で動く[^vsr]。TypeScript で書かれ、Functional Source License（FSL-1.1-MIT）を採る。このライセンスは2年たつと MIT License に移る[^vsr]。

#### リポジトリマネージャー

大企業では、多くのパッケージの形式を1か所で扱うリポジトリマネージャーがよく使われる。

- Sonatype Nexus Repository には無料の Community Edition がある。悪意のあるパッケージを止める機能は、有料の Pro+ にある[^nexus]。
- JFrog Artifactory は60種類以上のアーティファクトを扱う。アドオンの Curation は、リスクのあるオープンソースのパッケージを取り込む前に止める[^artifactory]。

#### コードフォージ

GitLab、Gitea、Forgejo は、Git のホスティングの隣に npm レジストリを持つ[^gitlab][^gitea][^forgejo]。GitLab はパッケージが見つからないとき、既定でリクエストを npmjs.com に転送する。ドキュメントは、これでプライベートなパッケージの名前が公開レジストリに漏れると警告している[^gitlab]。

### ホスト型のサービス

#### GitHub Packages

GitHub Packages は、npm.pkg.github.com に npm レジストリを持つ[^ghp]。スコープ付きのパッケージだけを受け付ける。公開のパッケージを入れるときもアクセストークンが要り、使えるのはパーソナルアクセストークン（クラシック）だけである[^ghp]。公開のパッケージは無料である。プライベートなパッケージは、プランごとのストレージと転送の枠に数えられる[^ghp-billing]。

2026年10月20日、GitHub はパッケージファイアウォールをパブリックプレビューとして出した[^gh-firewall]。公開の npm レジストリの前に置くホスト型のプロキシで、管理者のポリシーでパッケージを止める。使えるのは GitHub Enterprise Cloud だけで、対象は npm だけである[^gh-firewall]。

#### vlt

vlt 1.0 は2026年9月に出て、ホスト型のレジストリも同時に一般提供になった[^vlt-infoq]。このレジストリは、既知の悪意のあるパッケージを配る前に拒む。npm の公開ミラーはログインなしで使える[^vlt]。無料のプランには、アップストリームのプロキシと2GBのストレージと配信が含まれる[^vlt-pricing]。

#### その他のサービス

Cloudsmith は30以上の形式を扱うマネージドサービスである。新しいバージョンを、公開から一定の期間がたつまで保留できる（クールダウン）[^cloudsmith]。AWS CodeArtifact、Azure Artifacts、Google Artifact Registry も、それぞれのクラウドの中で npm のパッケージを提供している[^codeartifact][^azure][^gar]。

### 公開ミラー

npmmirror（registry.npmmirror.com）は、中国の利用者に向けた npmjs.com の読み取り専用の完全なミラーである[^npmmirror]。リアルタイムで同期を保つよう努めている。サーバーの cnpmcore はオープンソースである[^npmmirror]。

### JSR

[JSR](/sloppedia/jsr) は npm レジストリの写しではない。JavaScript と TypeScript のための、独自のモデルを持つレジストリである[^jsr]。Deno が2024年3月1日にパブリックベータとして公開した[^jsr-beta]。TypeScript はそのまま公開し、JSR は npm のクライアントが入れられる形でもパッケージを配る。pnpm 10.9 と Yarn 4.9 は `jsr:` のプロトコルに対応し、ほかのクライアントは `npx jsr add` を使う[^jsr]。GitHub Actions から公開したパッケージには、来歴のステートメントが自動で付く[^jsr-trust]。

JSR はまだプライベートなパッケージを置けない[^jsr-private]。ガバナンスボードには Evan You、Isaac Schlueter、James Snell、Luca Casonato、Ryan Dahl が名を連ね、JSR を財団へ移す計画である[^jsr-governance]。

2026年10月9日、Deno はチームの全員が Cloudflare に加わると発表した[^deno-cloudflare]。発表によると、JSR は運営を続け、インフラは Cloudflare に移る。

## 比較

| 名前             | 運営                     | 形                         | ライセンス            | 言語       | npm 以外の形式       |
| ---------------- | ------------------------ | -------------------------- | --------------------- | ---------- | -------------------- |
| pnpr             | pnpm（Zoltan Kochan）    | セルフホスト               | PolyForm Shield 1.0.0 | Rust       | Cargo、PyPI、OCI     |
| Verdaccio        | Verdaccio のコミュニティ | セルフホスト               | MIT                   | TypeScript | なし                 |
| vsr              | vlt                      | セルフホスト（Cloudflare） | FSL-1.1-MIT           | TypeScript | なし                 |
| Nexus Repository | Sonatype                 | セルフホストかホスト型     | 無料版と有料版        | Java       | 多数                 |
| Artifactory      | JFrog                    | セルフホストかホスト型     | 商用                  | 非公開     | 60種類以上           |
| GitHub Packages  | GitHub                   | ホスト型                   | サービス              | 非公開     | コンテナ、Maven など |
| vlt のレジストリ | vlt                      | ホスト型                   | サービス              | 非公開     | なし                 |
| JSR              | Deno                     | ホスト型                   | MIT                   | Rust       | なし（独自のモデル） |
| npmmirror        | npmmirror.com            | ホスト型（読み取り専用）   | MIT                   | TypeScript | バイナリのミラー     |

## 評価

Sloppedia の持ち主の masseater は、`@r_masseater/msch` などのパッケージを公開の npm レジストリに出している。この記事は、pnpm のチームによるレジストリの例として pnpr が挙がったことから書かれた。

## 関連項目

- [pnpm](/sloppedia/pnpm)
- [Vite+](/sloppedia/vite-plus)
- [Cargo](/sloppedia/cargo)
- [uv](/sloppedia/uv)

[^npm-plan]: GitHub「[Our plan for a more secure npm supply chain](https://github.blog/security/supply-chain-security/our-plan-for-a-more-secure-npm-supply-chain/)」The GitHub Blog、2025年9月22日。

[^trusted-ga]: GitHub「[npm trusted publishing with OIDC is generally available](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/)」GitHub Changelog、2025年7月31日。

[^classic-disabled]: GitHub「[npm security update: Classic token creation disabled and granular token changes](https://github.blog/changelog/2025-11-05-npm-security-update-classic-token-creation-disabled-and-granular-token-changes/)」GitHub Changelog、2025年11月5日。

[^classic-revoked]: 「[npm classic tokens revoked, session-based auth and CLI token management now available](https://github.blog/changelog/2025-12-09-npm-classic-tokens-revoked-session-based-auth-and-cli-token-management-now-available/)」GitHub Changelog、2025年12月9日。

[^staged]: GitHub「[Staged publishing and new install-time controls for npm](https://github.blog/changelog/2026-05-22-staged-publishing-and-new-install-time-controls-for-npm/)」GitHub Changelog、2026年5月22日。

[^tokens]: npm Docs「[About access tokens](https://docs.npmjs.com/about-access-tokens)」。2026年11月15日に閲覧。

[^verdaccio-7]: Verdaccio「[What's new in Verdaccio 7](https://www.verdaccio.org/blog/2026/10/25/verdaccio-7-release/)」Verdaccio Blog、2026年10月25日。

[^pnpr]: pnpm「[pnpr](https://pnpm.io/pnpr)」。2026年11月15日に閲覧。

[^pnpr-npm]: 「[@pnpm/pnpr](https://www.npmjs.com/package/@pnpm/pnpr)」npm。2026年11月15日に閲覧。

[^pnpr-accel]: pnpm「[Install acceleration](https://pnpm.io/pnpr/install-acceleration)」。2026年11月15日に閲覧。

[^pnpr-ecosystems]: pnpm「[Cargo and Python registries](https://pnpm.io/pnpr/ecosystems)」。2026年11月15日に閲覧。

[^pnpr-config]: pnpm「[Configuration](https://pnpm.io/pnpr/configuration)」。2026年11月15日に閲覧。

[^pnpr-license]: pnpm「[License](https://pnpm.io/pnpr/license)」。2026年11月15日に閲覧。

[^pnpr-storage]: pnpm「[Storage backends (S3 / R2)](https://pnpm.io/pnpr/storage)」。2026年11月15日に閲覧。

[^pnpr-cloudflare]: pnpm「[Deploying on Cloudflare](https://pnpm.io/pnpr/cloudflare)」。2026年11月15日に閲覧。

[^pnpr-rfcs]: 「[Implement the pnpr RFCs merged October 31 – November 2, 2026](https://github.com/pnpm/tasks/issues/244)」pnpm/tasks、2026年11月2日。

[^pnpm-blog]: pnpm「[pnpm 12.20.0](https://pnpm.io/blog/releases/12.20.0)」pnpm Blog、2026年11月12日。

[^verdaccio]: Verdaccio「[Verdaccio](https://www.verdaccio.org/)」。2026年11月15日に閲覧。

[^verdaccio-story]: Juan Picado「[The crazy story of Verdaccio](https://dev.to/verdaccio/the-crazy-story-of-verdaccio-45p0)」DEV Community、2019年2月8日。

[^verdaccio-releases]: 「[Releases · verdaccio/verdaccio](https://github.com/verdaccio/verdaccio/releases)」GitHub。2026年11月15日に閲覧。

[^vsr]: 「[vltpkg/vsr](https://github.com/vltpkg/vsr)」GitHub。2026年11月15日に閲覧。

[^nexus]: Sonatype「[Pricing](https://www.sonatype.com/products/pricing)」。2026年11月15日に閲覧。

[^artifactory]: JFrog「[JFrog Artifactory](https://jfrog.com/artifactory/)」。2026年11月15日に閲覧。

[^gitlab]: GitLab Docs「[npm packages in the package registry](https://docs.gitlab.com/user/packages/npm_registry/)」。2026年11月15日に閲覧。

[^gitea]: Gitea Docs「[NPM Package Registry](https://docs.gitea.com/usage/packages/npm)」。2026年11月15日に閲覧。

[^forgejo]: Forgejo「[npm Package Registry](https://forgejo.org/docs/latest/user/packages/npm/)」。2026年11月15日に閲覧。

[^ghp]: GitHub Docs「[Working with the npm registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)」。2026年11月15日に閲覧。

[^ghp-billing]: GitHub Docs「[GitHub Packages billing](https://docs.github.com/en/billing/managing-billing-for-github-packages/about-billing-for-github-packages)」。2026年11月15日に閲覧。

[^gh-firewall]: GitHub「[GitHub package firewall in public preview](https://github.blog/changelog/2026-10-20-github-package-firewall-in-public-preview/)」GitHub Changelog、2026年10月20日。

[^vlt-infoq]: 「[vlt 1.0 Ships as a Drop-in npm Replacement with Phased Installs, Graph Queries, and Malware-Blocking](https://www.infoq.com/news/2026/09/vlt-npm-replacement/)」InfoQ、2026年9月7日。

[^vlt]: vlt「[vlt](https://www.vlt.io/)」。2026年11月15日に閲覧。

[^vlt-pricing]: vlt「[Pricing](https://www.vlt.io/pricing)」。2026年11月15日に閲覧。

[^cloudsmith]: Cloudsmith「[Cloudsmith](https://cloudsmith.com/)」。2026年11月15日に閲覧。

[^codeartifact]: AWS「[Using CodeArtifact with npm](https://docs.aws.amazon.com/codeartifact/latest/ug/using-npm.html)」AWS CodeArtifact User Guide。2026年11月15日に閲覧。

[^azure]: Microsoft「[Publish and download npm packages with Azure Artifacts](https://learn.microsoft.com/en-us/azure/devops/artifacts/get-started-npm)」Microsoft Learn。2026年11月15日に閲覧。

[^gar]: Google Cloud「[Get started with Node.js packages](https://cloud.google.com/artifact-registry/docs/nodejs)」Artifact Registry documentation。2026年11月15日に閲覧。

[^npmmirror]: 「[npmmirror](https://npmmirror.com/)」。2026年11月15日に閲覧。

[^jsr]: JSR「[Introduction to JSR](https://jsr.io/docs)」JSR Docs。2026年11月15日に閲覧。

[^jsr-beta]: Deno「[Introducing JSR - the JavaScript Registry](https://deno.com/blog/jsr_open_beta)」Deno Blog、2024年3月1日。

[^jsr-trust]: JSR「[Provenance and trust](https://jsr.io/docs/trust)」JSR Docs。2026年11月15日に閲覧。

[^jsr-private]: JSR「[Private registries](https://jsr.io/docs/private-registries)」JSR Docs。2026年11月15日に閲覧。

[^jsr-governance]: JSR「[Governance](https://jsr.io/docs/governance)」JSR Docs。2026年11月15日に閲覧。

[^deno-cloudflare]: Ryan Dahl「[Deno is joining Cloudflare](https://deno.com/blog/cloudflare)」Deno Blog、2026年10月9日。
