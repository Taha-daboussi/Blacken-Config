#!/usr/bin/env bash
set -u

herdr_bin="${HERDR_BIN_PATH:-herdr}"
pane_id="${HERDR_ACTIVE_PANE_ID:-}"

fail() {
  printf '\n%s\n\nPress any key to close.' "$1"
  read -rsn1 _
  exit 1
}

[ -n "$pane_id" ] || fail "No active pane found."

info="$("$herdr_bin" pane get "$pane_id" 2>&1)" || fail "Could not read pane $pane_id: $info"
label="$(printf '%s' "$info" | jq -r '.result.pane | [.agent, .terminal_title_stripped] | map(select(. != null and . != "")) | join(" - ")' 2>/dev/null)"

printf '\n  Close this pane?\n\n'
[ -n "$label" ] && printf '  %s\n' "$label"
printf '  %s\n\n' "$pane_id"
printf '  [y] close    [any other key] cancel '

read -rsn1 answer
case "$answer" in
  y|Y)
    out="$("$herdr_bin" pane close "$pane_id" 2>&1)" || fail "Could not close pane $pane_id: $out"
    ;;
esac
exit 0
