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
settings="$HOME/.claude/settings.json"
add_hook=1
for a in "$@"; do
  case $a in
    --no-hook) add_hook= ;;
    -h|--help) echo "install.sh [--no-hook]: link the dispatch skill, agents and scripts; --no-hook does not add the dispatch-context SessionStart hook to $settings"; exit 0 ;;
    *) echo "install.sh: unknown argument $a" >&2; exit 2 ;;
  esac
done

need=()
for t in git jq claude; do command -v "$t" >/dev/null || need+=("$t"); done
if ! { command -v hc >/dev/null && command -v herdr-app >/dev/null; } && ! command -v tmux >/dev/null; then
  need+=("herdr-app (hc) or tmux")
fi
if [ ${#need[@]} -gt 0 ]; then
  echo "install.sh: required tools are missing: ${need[*]}. Install them, then run this again." >&2
  exit 1
fi

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
for f in dispatch dispatch-pick-tab dispatch-move-tab dispatch-close dispatch-stats dispatch-step dispatch-ui-diff dispatch-pr-overlap dispatch-eval dispatch-draft dispatch-guard-expected dispatch-guard-role dispatch-wt-check dispatch-rule-scan dispatch-context dispatch-title dispatch-count dispatch-queue; do
  link "$src/bin/$f" "$bin/$f"
done
link "$src/statusline/dispatch-segment.sh" "$bin/dispatch-statusline"
link "$src/hooks/dispatch-main.sh" "$hooks/dispatch-main.sh"

optional=(
  "gh:PRs, reviews and feedback tasks"
  "python3:dispatch-stats and dispatch-ui-diff"
  "magick:the pixel diff of the UI e2e"
  "tesseract:the OCR text of the UI e2e"
  "browser-harness:the web UI e2e (or the tool that test-env.md names)"
  "claude-tg:the ping when a pane waits for you"
  "timeout:the time limit of the gate and the tests"
  "flock:the start lock (without it, dispatch uses a mkdir lock)"
)
for o in "${optional[@]}"; do
  command -v "${o%%:*}" >/dev/null || echo "optional tool missing: ${o%%:*} (needed for ${o#*:})"
done
if command -v hc >/dev/null && command -v herdr-app >/dev/null; then
  echo "runner: herdr$(command -v tmux >/dev/null && echo ", and tmux when the dispatcher is not in herdr")"
else
  echo "runner: tmux (herdr-app is not installed). Each task opens a window in the tmux session \"dispatch\": tmux attach -t dispatch"
fi

hook_cmd='"$HOME/.local/bin/dispatch-context"'
if [ -e "$settings" ] && jq -e '[.hooks.SessionStart[]?.hooks[]?.command // empty] | any(test("dispatch-context"))' "$settings" >/dev/null; then
  :
elif [ -n "$add_hook" ]; then
  if [ -e "$settings" ]; then
    mkdir -p "$backups"
    cp "$settings" "$backups/settings.json"
  else
    mkdir -p "$(dirname "$settings")"
    echo '{}' >"$settings"
  fi
  tmp=$(mktemp)
  jq --arg c "$hook_cmd" '.hooks.SessionStart = ((.hooks.SessionStart // []) + [{hooks: [{type: "command", command: $c, timeout: 10}]}])' "$settings" >"$tmp"
  jq -e '.hooks.SessionStart' "$tmp" >/dev/null
  cat "$tmp" >"$settings"
  rm "$tmp"
  echo "hook: added the dispatch-context SessionStart hook to $settings$([ -e "$backups/settings.json" ] && echo " (backup: $backups/settings.json)"). Each session of a repo now loads its BLACKFILE index."
else
  echo "hook: not added (--no-hook). Without the dispatch-context SessionStart hook, sessions outside dispatch do not load the BLACKFILE index."
fi

if ! jq -e '[.hooks.SessionStart[]?.hooks[]?.command] | any(test("dispatch-main.sh"))' "$HOME/.claude/settings.json" >/dev/null 2>&1; then
  echo "Optional: to make each herdr session a dispatcher, add this SessionStart hook to ~/.claude/settings.json:"
  echo '  {"hooks": {"SessionStart": [{"hooks": [{"type": "command", "command": "bash \"$HOME/.claude/hooks/dispatch-main.sh\""}]}]}}'
fi
echo "Footer: make your Claude status line command print the output of \`dispatch-statusline\` (it reads DISPATCH_TERM or HC_TERMINAL_ID)."
for old in "$config"/overlays/*.md; do
  [ -e "$old" ] || continue
  r=$(basename "$old" .md)
  [ -e "$config/$r/BLACKFILE.md" ] || echo "Old overlay without BLACKFILE.md: $old. Run: dispatch --type init --name init (in that repo)."
done
echo "Project files: $config/<name>/BLACKFILE.md (an index) + chunks next to it (templates: $src/skill/templates/blackfile/)"
