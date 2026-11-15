#!/usr/bin/env bash
set -euo pipefail

platform="${1:?usage: launch-installed.sh linux-x64|macos-arm64|windows-x64 <installers> <output>}"
installers="$(cd "${2:?}" && pwd)"
output="$(mkdir -p "${3:?}" && cd "$3" && pwd)"
identifier=dev.masseater.yakusu
ready_pattern="model loaded"
timeout_seconds=600

case "$platform" in
  linux-x64)
    sudo apt-get install -y "$installers"/deb/*.deb xvfb imagemagick
    export DISPLAY=:99
    Xvfb "$DISPLAY" -screen 0 1280x800x24 &
    sleep 2
    yakusu >"$output/app.log" 2>&1 &
    log="$HOME/.local/share/$identifier/logs/llama-server.log"
    screenshot() { import -window root "$1"; }
    processes() { pgrep -fa 'yakusu|llama-server' || true; }
    ;;
  macos-arm64)
    mount="$(mktemp -d)"
    printf "Y\n" | hdiutil attach "$installers"/*.dmg -nobrowse -readonly -mountpoint "$mount" >/dev/null
    cp -R "$mount/yakusu.app" /Applications/
    hdiutil detach "$mount"
    spctl --assess --type execute -vv /Applications/yakusu.app >"$output/gatekeeper.txt" 2>&1 || true
    open /Applications/yakusu.app
    log="$HOME/Library/Logs/$identifier/llama-server.log"
    screenshot() { screencapture -x "$1"; }
    processes() { pgrep -fl 'yakusu|llama-server' || true; }
    ;;
  windows-x64)
    "$installers"/*.exe /S
    app="$(find "$LOCALAPPDATA" -maxdepth 3 -name yakusu.exe -print -quit)"
    if [ -z "$app" ]; then
      echo "the installer did not put yakusu.exe under $LOCALAPPDATA" >&2
      exit 1
    fi
    powershell -NoProfile -Command "Start-Process -FilePath '$(cygpath -w "$app")'"
    log="$(cygpath -u "$LOCALAPPDATA")/$identifier/logs/llama-server.log"
    screenshot() {
      powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms,System.Drawing; \$b=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds; \$i=New-Object System.Drawing.Bitmap \$b.Width,\$b.Height; [System.Drawing.Graphics]::FromImage(\$i).CopyFromScreen(\$b.Location,[System.Drawing.Point]::Empty,\$b.Size); \$i.Save('$(cygpath -w "$1")')"
    }
    processes() { tasklist | grep -iE "yakusu|llama-server" || true; }
    ;;
  *)
    echo "unknown platform: $platform" >&2
    exit 1
    ;;
esac

ready=0
for _ in $(seq "$((timeout_seconds / 5))"); do
  if [ -f "$log" ] && grep -q "$ready_pattern" "$log"; then
    ready=1
    break
  fi
  sleep 5
done

sleep 5
screenshot "$output/screen.png"
processes | tee "$output/processes.txt"
if [ -f "$log" ]; then
  cp "$log" "$output/llama-server.log"
fi

if [ "$ready" -ne 1 ]; then
  echo "the installed app did not get llama-server to load the model within $timeout_seconds seconds" >&2
  tail -n 40 "$output/llama-server.log" 2>/dev/null || echo "llama-server wrote no log at $log" >&2
  exit 1
fi
echo "the installed app started llama-server and it loaded the model"
