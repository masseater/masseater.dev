---
title: "PostHog のログのベストプラクティス"
description: "PostHog が公式の文書で公開している、INFO のログをリクエストごとの wide event にまとめるよう勧めるログの指針。"
tags: ["ログ", "オブザーバビリティ", "PostHog", "OpenTelemetry"]
published: true
infobox:
  - label: "発行"
    value: "PostHog"
  - label: "掲載"
    value: "PostHog Docs"
  - label: "前提"
    value: "OpenTelemetry（OTLP）の構造化ログ"
  - label: "中心の概念"
    value: "wide event、tail sampling"
---

PostHog のログのベストプラクティスは、PostHog が公式の文書で公開しているログの指針である。多くのログは役に立たず、それは量が足りないからではなく、間違ったものを多く、正しいものを少なく残すからだという主張から始まる。PostHog は OpenTelemetry（OTLP）でログを受け取るので、指針も OTel の構造化ログのモデルを前提にしている[^posthog]。

## イベントとログの区別

指針は、イベントは利用者が何をしたか、ログはシステムが何をしたかを記録するものだと区別する。データベースへの接続の失敗や外部 API のタイムアウトを PostHog のイベントとして送っていたなら、それはログに移すべきだという[^posthog]。

## wide event

指針が最も重要だとするのは、コードが何をしているかではなく、リクエストに何が起きたかを記録することである。処理の段階ごとに INFO のログを6行出すのではなく、リクエストごと、サービスごとに、所要時間、利用者、注文、金額、決済手段、再試行の回数などをまとめた1件のログを出す。これを wide event と呼び、canonical log line とも言う。段階ごとの細かいログは DEBUG に置き、調べるときだけ有効にする[^posthog]。

長く動く処理や、複数のサービスにまたがる処理では、ジョブの開始や段階の完了のような区切りごとに、そこまでの文脈をすべて持った wide event を出す混成の形を勧めている[^posthog]。

## カーディナリティと次元

フィールドが取る値の種類の数をカーディナリティ、1件のログが持つフィールドの数を次元と呼び、どちらも高いのが良いとする。ClickHouse のような列指向のデータベースは高いカーディナリティを苦にしないので、古い道具の事情で必要なフィールドを避けるべきではないという[^posthog]。

## ログのレベル

ERROR は誰かが対応すべき失敗、WARN は失敗にならなかった想定外の事態、INFO は記録する価値のある通常の動作、DEBUG は調査中の詳細に使う。誰も見ない ERROR はエラーではなく雑音であり、DEBUG は本番では既定で切っておく[^posthog]。

## サンプリング

規模が大きくなったら、リクエストが終わった後に結果を見て残すかを決める tail sampling を使う。エラー、p99 を超えた遅いリクエスト、重要な顧客のリクエストはすべて残す。tail sampling の実装が難しいうちは、先に一定の割合を無作為に残す head sampling から始めてよいとしている[^posthog]。

## 記録しないもの

秘密情報、リクエストとレスポンスの本文、必要のない個人情報、ヘルスチェック、下流ですでに記録している重複は記録しない。ログのフィールド名と値の形式は、ダッシュボードやアラートが頼る契約なので、公開 API と同じように扱い、消す前に非推奨の期間を置く[^posthog]。

[^posthog]: PostHog「[Logging best practices](https://posthog.com/docs/logs/best-practices)」PostHog Docs。
