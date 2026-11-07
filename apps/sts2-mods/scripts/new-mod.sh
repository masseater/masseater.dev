#!/usr/bin/env bash
# templates/mod から新しい Mod を作り、ルートの sts2-mods.sln とワークショップ用ワークスペースに登録する。
#
# 使い方: scripts/new-mod.sh <ModName>
#   ModName は英数字のみ (スペース・アンダースコア不可)
set -euo pipefail

mod="${1:?使い方: scripts/new-mod.sh <ModName>}"
[[ "$mod" =~ ^[A-Za-z][A-Za-z0-9]*$ ]] || { echo "Mod 名は英字で始まる英数字だけにしてください: $mod" >&2; exit 1; }
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
dst="$repo_root/mods/$mod"
[ -e "$dst" ] && { echo "既にあります: $dst" >&2; exit 1; }

# テンプレートをコピーし、ファイル名と中身の __MOD__ を置き換える
cp -R "$repo_root/templates/mod" "$dst"
find "$dst" -depth -name '*__MOD__*' | while read -r p; do
  mv "$p" "$(dirname "$p")/$(basename "$p" | sed "s/__MOD__/$mod/g")"
done
find "$dst" -type f | while read -r f; do
  sed -i.bak "s/__MOD__/$mod/g" "$f" && rm -f "$f.bak"
done

# ワークショップ用ワークスペース
ws="$repo_root/workshop/$mod"
mkdir -p "$ws/content"
touch "$ws/content/.gitkeep"
cp "$repo_root/workshop/MyFirstMod/image.png" "$ws/image.png"
cat > "$ws/workshop.json" <<JSON
{
  "title": "$mod",
  "description": "",
  "visibility": "private",
  "changeNote": "Initial release",
  "tags": [],
  "dependencies": [3737335127],
  "contentDescriptors": []
}
JSON

if command -v dotnet >/dev/null; then
  dotnet sln "$repo_root/sts2-mods.sln" add "$dst/$mod.csproj"
else
  echo "dotnet が無いので sln への追加をスキップしました。後で: dotnet sln sts2-mods.sln add mods/$mod/$mod.csproj" >&2
fi

echo "作成しました: mods/$mod, workshop/$mod"
echo "画像やローカライズを入れる場合は mods/$mod/$mod/ フォルダを作り、$mod.json の has_pck を true にしてください"
