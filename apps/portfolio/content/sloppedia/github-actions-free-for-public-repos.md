---
title: "GitHub Actions の料金"
description: "GitHub Actions の課金の仕組み。public リポジトリの標準ランナーは無料で、private リポジトリはプランごとの金額の枠から差し引かれる。"
tags: ["GitHub Actions", "GitHub"]
published: true
infobox:
  - label: "提供"
    value: "GitHub"
  - label: "課金の単位"
    value: "分（1分未満は切り上げ）"
  - label: "Linux 2コアの単価"
    value: "1分あたり0.006ドル"
  - label: "無料の範囲"
    value: "public リポジトリの標準ランナー、セルフホストランナー"
---

GitHub Actions の料金は、GitHub の CI/CD の機能である GitHub Actions に課される料金の仕組みである。public リポジトリで標準の GitHub-hosted runner を使う分は無料で、private リポジトリで使う分は、プランに含まれる毎月の金額の枠から差し引かれる[^billing]。

## 無料の範囲

次の利用は、プランの枠を減らさずに無料で使える[^billing]。

- public リポジトリでの標準の GitHub-hosted runner
- セルフホストランナー
- GitHub Pages と Dependabot での標準ランナー

## 含まれる枠

private リポジトリでの利用は、プランに含まれる「included compute usage」から差し引かれる。枠は分数ではなく金額で決まっており、ジョブごとの分数に各ランナーの単価を掛けた額が引かれる。枠は請求の周期ごとに戻る[^billing]。

| プラン                        | 毎月の枠 | 成果物のストレージ |
| ----------------------------- | -------- | ------------------ |
| GitHub Free                   | 12ドル   | 500 MB             |
| GitHub Pro                    | 18ドル   | 1 GB               |
| GitHub Free for organizations | 12ドル   | 500 MB             |
| GitHub Team                   | 18ドル   | 2 GB               |
| GitHub Enterprise Cloud       | 300ドル  | 50 GB              |

GitHub は目安として、300ドルで標準の Linux ランナーを5万分使えるとしている。キャッシュのストレージの枠は、どのプランでもリポジトリごとに10 GB である[^billing]。

## 単価

標準ランナーの1分あたりの単価は、Linux の2コア（x64）が0.006ドル、Windows の2コアが0.010ドル、macOS が0.062ドルである。1コアの Linux は0.002ドルである[^pricing]。

## larger runner

コア数の多い larger runner は、GitHub Team と GitHub Enterprise Cloud の organization だけが使え、public リポジトリでも課金される[^billing]。Linux の64コアは1分あたり0.162ドル、GPU 付きの Linux 4コアは0.052ドルである[^pricing]。

## ストレージ

成果物と GitHub Packages のストレージは同じ枠を共有し、1時間ごとの使用量を GB 時間で積み上げて請求する。月の途中で成果物を消しても、それまでに積み上がった分は請求に残る[^billing]。

[^billing]: GitHub「[GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)」GitHub Docs。

[^pricing]: GitHub「[Actions runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing)」GitHub Docs。
