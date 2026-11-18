#!/usr/bin/env bash
set -euo pipefail
repo="$(cd "$(dirname "$0")" && pwd)"
app="$HOME/.config/herdr-app"
tui="$HOME/.config/herdr"

mkdir -p "$repo/herdr/plugins"
rsync -a --delete "$tui/config.toml" "$repo/herdr/"
rsync -a --delete "$tui/scripts/" "$repo/herdr/scripts/"
rsync -a --delete "$tui/plugins/config/" "$repo/herdr/plugins/config/"
for d in "$tui"/plugins/github/*/; do
  printf '%s %s\n' "$(git -C "$d" remote get-url origin)" "$(git -C "$d" rev-parse HEAD)"
done > "$repo/herdr/plugins.txt"

mkdir -p "$repo/herdr-app"
for f in settings.json keys.json programs.json; do
  cp "$app/$f" "$repo/herdr-app/$f"
done
rsync -a --delete --exclude '.state' "$app/layouts/" "$repo/herdr-app/layouts/"
rsync -a --delete "$app/themes/" "$repo/herdr-app/themes/"

mods=()
for m in "$app"/mods/*/; do
  name="$(basename "$m")"
  case "$name" in herdr-web-browser*) continue ;; esac
  jq -e --arg m "$name" 'has($m)' "$app/installed.json" >/dev/null || mods+=("$name")
done
rm -rf "$repo/herdr-app/mods"
mkdir -p "$repo/herdr-app/mods"
for name in "${mods[@]}"; do
  rsync -a --exclude node_modules --exclude gpui-kit.d.ts --exclude .cache "$app/mods/$name/" "$repo/herdr-app/mods/$name/"
done

grep -rlF "$HOME" "$repo/herdr" "$repo/herdr-app" | while read -r f; do
  sed -i "s|$HOME|__HOME__|g" "$f"
done
echo "Synced: ${mods[*]}"
