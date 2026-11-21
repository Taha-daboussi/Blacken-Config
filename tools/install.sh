#!/usr/bin/env bash
set -euo pipefail
repo="$(cd "$(dirname "$0")/.." && pwd)"
app="$HOME/.config/herdr-app"
tui="$HOME/.config/herdr"
stamp="$(date +%s)"

backup() { [ -e "$1" ] && cp -a "$1" "$1.bak.$stamp" || true; }

mkdir -p "$tui" "$app"
backup "$tui/config.toml"
for f in settings.json keys.json programs.json; do backup "$app/$f"; done

rsync -a "$repo/config/herdr/config.toml" "$tui/"
rsync -a "$repo/config/herdr/scripts/" "$tui/scripts/"
mkdir -p "$tui/plugins"
rsync -a "$repo/config/herdr/plugins/config/" "$tui/plugins/config/"
rsync -a "$repo/config/herdr-app/" "$app/"

mkdir -p "$HOME/.claude/hooks"
backup "$HOME/.claude/hooks/session-namer.sh"
cp "$repo/claude/hooks/session-namer.sh" "$HOME/.claude/hooks/"

grep -rlF "__HOME__" "$tui" "$app" --include='*.json' --include='*.toml' --include='*.yml' --include='*.sh' --include='*.js' 2>/dev/null | while read -r f; do
  sed -i "s|__HOME__|$HOME|g" "$f"
done

if [ -d "$app/mods/herdr-md/render" ] && [ ! -d "$app/mods/herdr-md/render/node_modules" ]; then
  (cd "$app/mods/herdr-md/render" && npm ci)
fi
echo "Installed. Plugins to install with herdr:"
cat "$repo/config/herdr/plugins.txt"
