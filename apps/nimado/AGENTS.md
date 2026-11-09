# nimado

ニコニコ動画と YouTube の再生数を曲ごとに並べるサイト。

- デプロイ: masseater.dev/nimado
- 画面は `alchemy.run.ts`、データは `alchemy.data.ts` の Worker が配る。データは `tools/nimado-collect` が毎日作り、`nimado` ワークフローが `published/data` に置いて当てる。
- YouTube の値はリポに入れず、30 日を超えて持たない。データの Worker の古いバージョンは `tools/nimado-collect` の `prune` が消す。
