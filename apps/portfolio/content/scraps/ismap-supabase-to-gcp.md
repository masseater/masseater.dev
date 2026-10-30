---
title: "ISMAP 準拠で Supabase から GCP へ移行する話"
description: "公的機関向けの予約システムで ISMAP 準拠を求められ、Supabase、Vercel、Resend をすべて GCP へ移している途中経過の記事である。登録済みのクラウドでも言明書の範囲に入る機能しか使えないこと、supabase-js 互換のクライアントを pg で作って環境変数で切り替えたこと、RLS のポリシーが所有者に結びついていて復元に手間取ったことが書かれている。"
date: 2026-10-30
tags: ["ismap", "supabase", "gcp"]
published: true
---

公的機関向けの予約システムで ISMAP 準拠を求められ、Supabase、Vercel、Resend をすべて GCP へ移している途中経過の[記事](https://note.com/juicy_eel7128/n/n83909929b2a3)である。登録済みのクラウドでも言明書の範囲に入る機能しか使えないこと、supabase-js 互換のクライアントを pg で作って環境変数で切り替えたこと、RLS のポリシーが所有者に結びついていて復元に手間取ったことが書かれている。
