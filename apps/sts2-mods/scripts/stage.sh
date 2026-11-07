#!/usr/bin/env bash
# Publish 済みの Mod ファイル (json / dll / pck) を、ゲームの mods フォルダから
# ワークショップ用ワークスペース workshop/<ModName>/content/<ModName>/ へコピーする。
# stage.ps1 の Mac / Linux 版。
#
# 使い方 (どこからでも可):
#   scripts/stage.sh MyFirstMod
#   STS2_PATH="/path/to/Slay the Spire 2" scripts/stage.sh MyFirstMod
set -euo pipefail

mod="${1:?使い方: scripts/stage.sh <ModName>}"
repo_root="$(cd "$(dirname "$0")/.." && pwd)"

case "$(uname)" in
  Darwin)
    sts2_path="${STS2_PATH:-$HOME/Library/Application Support/Steam/steamapps/common/Slay the Spire 2}"
    mods_dir="$sts2_path/SlayTheSpire2.app/Contents/MacOS/mods"
    ;;
  *)
    sts2_path="${STS2_PATH:-$HOME/.local/share/Steam/steamapps/common/Slay the Spire 2}"
    mods_dir="$sts2_path/mods"
    ;;
esac

src="$mods_dir/$mod"
workspace="$repo_root/workshop/$mod"
dst="$workspace/content/$mod"

[ -d "$workspace" ] || { echo "ワークスペースがありません: $workspace" >&2; exit 1; }
# アップローダは dependencies を数値として読むので、文字列だとアップロード時にパースで止まる
if tr -d '\n' < "$workspace/workshop.json" | grep -Eq '"dependencies"[[:space:]]*:[[:space:]]*\[[^]]*"'; then
  echo "workshop.json の dependencies は数値で書いてください (例: [3737335127])" >&2; exit 1
fi
[ -f "$src/$mod.json" ] || { echo "Mod が見つかりません: $src (先に dotnet publish してください)" >&2; exit 1; }

# マニフェストの has_dll / has_pck を読む (Mac 標準の python3 か plutil が無くても動くよう grep で見る)
flag() { grep -Eq "\"has_$1\"[[:space:]]*:[[:space:]]*true" "$src/$mod.json"; }

rm -rf "$dst"
mkdir -p "$dst"
cp "$src/$mod.json" "$dst/"
for ext in dll pck; do
  if flag "$ext"; then
    [ -f "$src/$mod.$ext" ] || { echo "マニフェストは has_$ext=true ですが $src/$mod.$ext がありません" >&2; exit 1; }
    cp "$src/$mod.$ext" "$dst/"
  fi
done

version="$(grep -Eo '"version"[[:space:]]*:[[:space:]]*"[^"]*"' "$src/$mod.json" | sed -E 's/.*"([^"]*)"$/\1/')"
echo "コピーしました ($version):"
for f in "$dst"/*; do echo "  $(basename "$f")"; done
