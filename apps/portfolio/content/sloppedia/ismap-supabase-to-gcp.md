---
title: "ISMAP 準拠のための Supabase からの移行"
description: "公的機関向けの予約システムが、ISMAP 準拠を求められて Supabase、Vercel、Resend から Google Cloud へ全面的に移った事例。"
tags: ["ISMAP", "Supabase", "Google Cloud", "クラウド移行"]
published: true
infobox:
  - label: "記録者"
    value: "たなか屋"
  - label: "公開"
    value: "2026年8月15日"
  - label: "移行元"
    value: "Supabase、Vercel、Resend"
  - label: "移行先"
    value: "Cloud SQL、Cloud Run、Identity Platform、Gmail API"
---

ISMAP 準拠のための Supabase からの移行は、公的機関向けの予約システムを、Supabase、Vercel、Resend の構成から Google Cloud（GCP）へ全面的に移した事例である。開発の途中で発注元から [ISMAP](/sloppedia/ismap) への準拠を求められ、3つのサービスがどれも ISMAP に登録されていなかったためである。開発者のたなか屋が、移行の途中経過を note に記録した[^note]。

## 背景

ISMAP は、政府情報システムのためのセキュリティ評価制度である。行政機関がクラウドサービスを調達するときは、原則として ISMAP に登録されたサービスから選ぶ[^note]。

ホスティング、データベース、メールのどれも本番のデータが通るため、対象外になる余地はほぼ無かった。CI/CD とソースの管理は本番のデータを扱わないが、デプロイの権限と秘密情報が通るため、筆者は判断を発注元に確認する事項とした[^note]。

## 移行先の選定

ISMAP では、登録されたサービスのうち言明書の範囲に入る機能だけが評価の対象になる。GCP は2021年に登録されているが、筆者は使いたい個別のサービスが範囲に入るかを一次資料の PDF で確かめた[^note]。

| 役割         | 移行先                                  |
| ------------ | --------------------------------------- |
| データベース | Cloud SQL（PostgreSQL、東京リージョン） |
| ホスティング | Cloud Run                               |
| 利用者の認証 | Identity Platform                       |
| メールの送信 | Gmail API                               |

メールは、Google Workspace の言明書に Gmail REST API が明記されていたことが決め手になった。Google Workspace はデータの保存場所を日本に固定できないため、Workspace の部分は対象外とすることで発注元と合意した[^note]。

## 移行の方法

筆者は、コードを先に書き、切り替えは環境変数で行う方針を取った。supabase-js の呼び出し側を書き換えずに済むよう、自分のコードが使う範囲だけを pg で作り直した互換のクライアントを用意した。`DATABASE_URL` があれば PostgreSQL へ直接つなぐ。PostgREST は日付を文字列で返し、pg は Date に変換するため、そこをそろえないとタイムゾーンのずれたバグが出るという[^note]。

データの移し替えでは、Supabase に固有の拡張や auth スキーマへの参照を除くか空の定義で補った。最も手間取ったのは、行レベルセキュリティ（RLS）のポリシーがテーブルの所有者に結びついていた点で、所有権をアプリ用のユーザーに移してから復元する必要があった[^note]。

## 時間帯運用

テスト環境では、朝8時の起動と夜20時の停止を Cloud Scheduler で行う運用とした。止めている間に起動した Cloud Run のコンテナは Cloud SQL への接続を張れないまま残り、データベースを起動した後も張り直さなかった。新しいリビジョンをデプロイしてコンテナを入れ替えることで解決した[^note]。

Cloud SQL の Admin API は、止めたインスタンスでも state に RUNNABLE を返す。止めている間もパブリック IP の予約に1時間0.01ドルの課金と、ストレージの課金が続く[^note]。

[^note]: たなか屋「[ISMAP準拠が必要になって、SupabaseからGCPに移行しようとしている話](https://note.com/juicy_eel7128/n/n83909929b2a3)」note、2026年8月15日。
