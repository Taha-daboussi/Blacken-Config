#!/usr/bin/env bash
set -euo pipefail
src="$(cd "$(dirname "$0")" && pwd)"
stamp="$(date +%s)"
bin="$HOME/.local/bin"
skills="$HOME/.claude/skills"
agents="$HOME/.claude/agents"
hooks="$HOME/.claude/hooks"
config="${XDG_CONFIG_HOME:-$HOME/.config}/dispatch"
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

mkdir -p "$bin" "$skills" "$agents" "$hooks" "$config"
chmod 700 "$config"
link "$src/skill" "$skills/dispatch"
for s in grilling domain-modeling grill-with-docs; do link "$src/skills/$s" "$skills/$s"; done
for f in "$src"/agents/*.md; do link "$f" "$agents/$(basename "$f")"; done
for f in dispatch dispatch-close dispatch-stats dispatch-step dispatch-ui-diff dispatch-pr-overlap dispatch-eval dispatch-draft dispatch-guard-expected dispatch-context; do
  link "$src/bin/$f" "$bin/$f"
done
link "$src/statusline/dispatch-segment.sh" "$bin/dispatch-statusline"
link "$src/hooks/dispatch-main.sh" "$hooks/dispatch-main.sh"

missing=()
for t in herdr herdr-app hc jq gh git claude flock python3 magick tesseract; do command -v "$t" >/dev/null || missing+=("$t"); done
[ ${#missing[@]} -eq 0 ] || echo "missing tools: ${missing[*]}"

if ! jq -e '[.hooks.SessionStart[]?.hooks[]?.command] | any(test("dispatch-main.sh"))' "$HOME/.claude/settings.json" >/dev/null 2>&1; then
  echo "Optional: to make each herdr session a dispatcher, add this SessionStart hook to ~/.claude/settings.json:"
  echo '  {"hooks": {"SessionStart": [{"hooks": [{"type": "command", "command": "bash \"$HOME/.claude/hooks/dispatch-main.sh\""}]}]}}'
fi
echo "Footer: make your Claude status line command print the output of \`dispatch-statusline\` (it reads HC_TERMINAL_ID)."
for old in "$config"/overlays/*.md; do
  [ -e "$old" ] || continue
  r=$(basename "$old" .md)
  [ -e "$config/$r/BLACKFILE.md" ] || echo "Old overlay without BLACKFILE.md: $old. Run: dispatch --type init --name init (in that repo)."
done
echo "Project files: $config/<name>/BLACKFILE.md (an index) + chunks next to it (templates: $src/skill/templates/blackfile/)"
echo "Loader: add a SessionStart hook with the command \"dispatch-context\" to ~/.claude/settings.json, so each session of a repo loads its BLACKFILE index."
