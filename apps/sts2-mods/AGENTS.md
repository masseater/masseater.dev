# sts2-mods

Slay the Spire 2 (AppID 2868840, Godot/MegaDot 4.5.1 + C# net9.0) の Mod リポジトリ。初代 Slay the Spire (Java/ModTheSpire) の知識は使わないこと。

- Mod プロジェクトは `mods/<ModName>/`、ワークショップ用ワークスペースは `workshop/<ModName>/`
- 各 Mod は Alchyr.Sts2.Templates + BaseLib ベース。パスは `apps/sts2-mods/local.props`(gitignore)から読む
- ビルドにはゲーム本体の `sts2.dll` が必要なので、ゲームの無い環境では `dotnet build` は "Slay the Spire 2 data not found" で止まる(想定どおり)。型チェックは `vp run dotnet` がスタブ (`build/Sts2Stubs`) で行う
- タスクは `vp run <名前>`(`vite.config.ts`)。Makefile は使わない。検査・ビルドを足すときも `vite.config.ts` のタスクにする
- 警告=エラー。ルールを緩めて通さない。規約は `docs/development.md`
- cc-jev-teacher プラグイン(masseater.dev の `.claude/settings.json`)の skills に従う。
  - 自前で作る前に既存のライブラリ・機能を探す(dont-it-yourself)
  - エラーを握りつぶさずログを残し、「直った」「動く」は実物で確かめてから言う(measure-everything)
  - 名前は業務の言葉で付ける(domain-naming)
  - 文章は平易に書く(dead-cliche-writing)
- 実機(ゲーム本体)で確認していないことを「動く」と書かない。未確認なら未確認と書く
- ドキュメントとコメントは日本語で書く
