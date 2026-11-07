#!/usr/bin/env bash
# 静的検査をまとめて走らせる。vp run dotnet と masseater.dev の verify が使う。
#
#   1. マニフェスト (mods/<Mod>/<Mod>.json) の中身とフォルダ構成が合っているか
#   2. 整形 (.editorconfig) … 全 Mod
#   3. 型チェックとアナライザ (警告はすべてエラー)
#        - ゲームがある PC: 本物の sts2.dll でビルド
#        - ゲームが無い環境 (CI・クラウド): build/Sts2Stubs に対してビルド (スタブ対応の Mod だけ)
#   4. シェルスクリプト (shellcheck が入っていれば)
#
# 使い方:
#   scripts/check.sh            検査だけ
#   scripts/check.sh --fix      整形とコードスタイルを自動で直してから検査
#   scripts/check.sh --stubs    ゲームがあってもスタブで検査する (CI と同じ条件)
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

fix=false
force_stubs=false
for arg in "$@"; do
  case "$arg" in
    --fix) fix=true ;;
    --stubs) force_stubs=true ;;
    *) echo "不明な引数: $arg" >&2; exit 2 ;;
  esac
done

export DOTNET_NOLOGO=1 DOTNET_CLI_TELEMETRY_OPTOUT=1
failed=()
step() { printf '\n== %s ==\n' "$*"; }
fail() { echo "NG: $*" >&2; failed+=("$*"); }

mods=()
for dir in mods/*/; do
  mod="$(basename "$dir")"
  [ -f "mods/$mod/$mod.csproj" ] && mods+=("$mod")
done

# ---- 1. マニフェスト ----
step "マニフェスト"
json_bool() { grep -Eq "\"$2\"[[:space:]]*:[[:space:]]*true" "$1"; }
for mod in "${mods[@]}"; do
  manifest="mods/$mod/$mod.json"
  if [ ! -f "$manifest" ]; then fail "$mod: $manifest がありません"; continue; fi
  grep -Eq "\"id\"[[:space:]]*:[[:space:]]*\"$mod\"" "$manifest" || fail "$mod: $manifest の id がフォルダ名と違います"
  if [ -d "mods/$mod/$mod" ]; then
    json_bool "$manifest" has_pck || fail "$mod: アセットフォルダがあるのに has_pck が true ではありません"
  else
    json_bool "$manifest" has_pck && fail "$mod: アセットフォルダが無いのに has_pck が true です"
  fi
  grep -q "<TargetFramework>net9.0</TargetFramework>" "mods/$mod/$mod.csproj" || fail "$mod: csproj に TargetFramework (net9.0) を直書きしてください (MegaDot が書き換えるため)"
  if [ -d "workshop/$mod" ] && tr -d '\n' < "workshop/$mod/workshop.json" | grep -Eq '"dependencies"[[:space:]]*:[[:space:]]*\[[^]]*"'; then
    fail "$mod: workshop.json の dependencies は数値で書いてください"
  fi
done

# ゲームがあるかどうか (Sts2PathDiscovery.props が見つけた場所を使う)
data_dir="$(dotnet msbuild "mods/${mods[0]}/${mods[0]}.csproj" -getProperty:Sts2DataDir 2>/dev/null || true)"
use_stubs=true
if [ "$force_stubs" = false ] && [ -n "$data_dir" ] && [ -f "$data_dir/sts2.dll" ]; then
  use_stubs=false
fi
if [ "$use_stubs" = true ]; then
  echo "ゲーム本体が無いので build/Sts2Stubs で型チェックします (スタブ非対応の Mod は整形だけ)"
  export UseSts2Stubs=true
else
  echo "ゲーム本体で型チェックします: $data_dir"
fi

for mod in "${mods[@]}"; do
  proj="mods/$mod/$mod.csproj"
  typed=true
  if [ "$use_stubs" = true ] && [ "$(dotnet msbuild "$proj" -getProperty:SupportsSts2Stubs)" != "true" ]; then
    typed=false
  fi
  # コードスタイルを強制しない Mod (テンプレートのままの MyFirstMod など) は整形だけを見る
  strict_style=true
  [ "$(dotnet msbuild "$proj" -getProperty:EnforceCodeStyleInBuild)" = "true" ] || strict_style=false

  # ---- 2. 整形 / 3. 型チェック ----
  step "$mod"
  if [ "$typed" = true ]; then
    dotnet restore "$proj" -v q >/dev/null || { fail "$mod: restore"; continue; }
    format_args=("$proj" --no-restore -v q)
    [ "$strict_style" = true ] || format_args=(whitespace "${format_args[@]}")
    if [ "$fix" = true ]; then
      dotnet format "${format_args[@]}" || fail "$mod: dotnet format"
    fi
    dotnet format "${format_args[@]}" --verify-no-changes || fail "$mod: 整形・コードスタイル (scripts/check.sh --fix で直せます)"
    dotnet build "$proj" --no-restore -v q -clp:ErrorsOnly -p:CopyToModsFolder=false || fail "$mod: ビルド (型エラー・アナライザ)"
  else
    if [ "$fix" = true ]; then
      dotnet format whitespace "mods/$mod" --folder -v q || fail "$mod: dotnet format"
    fi
    dotnet format whitespace "mods/$mod" --folder --verify-no-changes -v q || fail "$mod: 整形 (scripts/check.sh --fix で直せます)"
    echo "スタブ非対応なので型チェックは省略 (ゲームのある PC で scripts/check.sh を実行すると検査されます)"
  fi
done

# ---- 4. シェルスクリプト ----
step "シェルスクリプト"
if command -v shellcheck >/dev/null; then
  shellcheck scripts/*.sh || fail "shellcheck"
else
  echo "shellcheck が無いので省略 (Mac: brew install shellcheck)"
fi

echo
if [ ${#failed[@]} -gt 0 ]; then
  echo "失敗: ${#failed[@]} 件" >&2
  printf '  - %s\n' "${failed[@]}" >&2
  exit 1
fi
echo "すべての検査に通りました"
