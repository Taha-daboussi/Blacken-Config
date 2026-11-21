#!/usr/bin/env bash
term=${HC_TERMINAL_ID:-}
[ -n "$term" ] || exit 0
f=${XDG_RUNTIME_DIR:-/tmp}/dispatch-state/$term.json
[ -r "$f" ] || exit 0
jq -r '
  (if .waiting then "\u001b[1;93m⏳ " else "\u001b[1;35m⚙ " end)
  + "dispatch \(.n)/10 \(.label)"
  + (if .waiting and (.wait_msg | length) > 0 then ": \(.wait_msg)" else "" end)
  + "\u001b[0m"' "$f" 2>/dev/null
