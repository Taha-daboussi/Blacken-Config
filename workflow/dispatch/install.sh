#!/usr/bin/env bash
set -euo pipefail
src="$(cd "$(dirname "$0")" && pwd)"
stamp="$(date +%s)"
bin="$HOME/.local/bin"
skills="$HOME/.claude/skills"
hooks="$HOME/.claude/hooks"
overlays="${XDG_CONFIG_HOME:-$HOME/.config}/dispatch/overlays"
backups="${XDG_STATE_HOME:-$HOME/.local/state}/dispatch/install-backup/$stamp"

link() {
  local target=$1 path=$2
  if [ -L "$path" ] && [ "$(readlink "$path")" = "$target" ]; then return; fi
  if [ -e "$path" ] || [ -L "$path" ]; then
    mkdir -p "$backups"
    mv "$path" "$backups/$(basename "$path")"
    echo "backup: $backups/$(basename "$path")"
  fi
  ln -s "$target" "$path"
  echo "linked: $path -> $target"
}

mkdir -p "$bin" "$skills" "$hooks" "$overlays"
chmod 700 "$(dirname "$overlays")"
link "$src/skill" "$skills/dispatch"
for f in dispatch dispatch-close dispatch-stats; do link "$src/bin/$f" "$bin/$f"; done
link "$src/hooks/dispatch-main.sh" "$hooks/dispatch-main.sh"

missing=()
for t in herdr herdr-app hc jq gh git claude flock; do command -v "$t" >/dev/null || missing+=("$t"); done
[ ${#missing[@]} -eq 0 ] || echo "missing tools: ${missing[*]}"

if ! jq -e '[.hooks.SessionStart[]?.hooks[]?.command] | any(test("dispatch-main.sh"))' "$HOME/.claude/settings.json" >/dev/null 2>&1; then
  echo "Optional: to make each herdr session a dispatcher, add this SessionStart hook to ~/.claude/settings.json:"
  echo '  {"hooks": {"SessionStart": [{"hooks": [{"type": "command", "command": "bash \"$HOME/.claude/hooks/dispatch-main.sh\""}]}]}}'
fi
echo "Private repo overlays: $overlays/<repo>.md (template: $src/overlays/example.md)"
