---
title: "ISMAP 準拠のための Supabase からの移行"
description: "公的機関向けの予約システムが ISMAP 準拠のために Supabase、Vercel、Resend を GCP へ移している事例。"
tags: ["ISMAP", "Supabase", "Google Cloud"]
published: true
---

**ISMAP 準拠のための Supabase からの移行**は、公的機関向けの予約システムが、政府情報システムのためのセキュリティ評価制度（ISMAP）への準拠を求められ、Supabase、Vercel、Resend をすべて Google Cloud（GCP）へ移している事例である。途中経過が note の記事にまとめられている[^note]。

## 分かったこと

記事は次の点を挙げている[^note]。

- ISMAP に登録済みのクラウドでも、言明書の範囲に入る機能しか使えない
- supabase-js と互換のクライアントを pg で作り、環境変数で切り替えた
- RLS のポリシーが所有者に結びついていて、復元に手間取った

[^note]: たなか屋「[ISMAP準拠が必要になって、SupabaseからGCPに移行しようとしている話](https://note.com/juicy_eel7128/n/n83909929b2a3)」note。
