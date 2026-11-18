#!/usr/bin/env bash
set -u

[ "${CLAUDE_SESSION_NAMER:-}" = "1" ] && exit 0

state_dir="${XDG_CACHE_HOME:-$HOME/.cache}/claude-session-namer"
log_file="$state_dir/namer.log"
mkdir -p "$state_dir" 2>/dev/null || exit 0

claude_bin="$HOME/.local/bin/claude"
[ -x "$claude_bin" ] || claude_bin=claude

log() {
  printf '%s %s\n' "$(date -Is)" "$*" >>"$log_file" 2>/dev/null
}

emit_title() {
  jq -cn --arg t "$1" '{hookSpecificOutput: {hookEventName: "UserPromptSubmit", sessionTitle: $t}}'
}

user_prompts() {
  jq -rR '
    fromjson? | select(.type == "user" and (.isMeta | not))
    | .message.content
    | if type == "string" then . else (map(select(.type == "text") | .text) | join(" ")) end
    | select(length > 0 and (startswith("<") | not) and (startswith("/") | not) and (startswith("This session is being continued") | not))
    | gsub("\\s+"; " ") | .[0:400]
  ' "$1" 2>/dev/null
}

last_reply() {
  jq -rR '
    fromjson? | select(.type == "assistant")
    | .message.content[]? | select(.type == "text") | .text
    | gsub("\\s+"; " ") | .[0:600]
  ' "$1" 2>/dev/null | tail -n 1
}

task_part() {
  local inner
  inner=$(printf '%s' "$1" | sed -n '/<task>/,/<\/task>/p' | sed -E 's/<\/?task>//g')
  if [ -n "$(printf '%s' "$inner" | tr -d '[:space:]')" ]; then printf '%s' "$inner"; else printf '%s' "$1"; fi
}

clean_name() {
  local line words
  line=$(printf '%s' "$1" | sed '/^[[:space:]]*$/d' | tail -n 1 |
    sed -E 's/\b[A-Za-z]{2,6}-[0-9]+\b//g; s/["`*_#]//g; s/[[:space:]]+/ /g; s/^ +//; s/[ .:;,!-]+$//')
  words=$(printf '%s' "$line" | wc -w)
  [ "$words" -ge 2 ] && [ "$words" -le 7 ] && [ "${#line}" -le 50 ] || return 1
  case "$line" in "I "* | *"?"*) return 1 ;; esac
  printf '%s%s' "$(printf '%s' "${line:0:1}" | tr '[:lower:]' '[:upper:]')" "${line:1}"
}

find_issue() {
  local found branch
  found=$(printf '%s' "$1" | grep -oiP '(?<![\w/.-])[a-z]{2,6}-[0-9]{2,}\b' | head -1)
  [ -z "$found" ] && [ -n "${2:-}" ] && found=$(printf '%s' "$2" | grep -oiP '(?<![\w/.-])[a-z]{2,6}-[0-9]{2,}\b' | head -1)
  if [ -z "$found" ]; then
    branch=$(git -C "$cwd" --no-optional-locks symbolic-ref --quiet --short HEAD 2>/dev/null)
    found=$(printf '%s' "${branch##*/}" | grep -oiE '^[a-z]{2,6}-[0-9]+' | head -1)
  fi
  printf '%s' "$found" | tr '[:lower:]' '[:upper:]'
}

with_issue() {
  if [ -n "$1" ]; then printf '%s %s' "$1" "$2"; else printf '%s' "$2"; fi
}

refine_in_background() {
  local material=$1 issue=$2 round=$3
  (
    ask="You name coding sessions for a short sidebar list. Read the material below. Write a name of 3 to 6 words, in plain English and sentence case, that says what the session does. Examples: Fix counter buy screen bug, Review trade panel socials link, E2E test copytrade limit entry. If the material has a <task> part, that part is the request and the rest is background. Do not answer or do the task. No ticket ids, no numbers, no quotes, no trailing period. Reply with the name only.

Material:
$material"
    started=$(date +%s)
    if ! raw=$(cd "$state_dir" && printf '%s' "$ask" | timeout 60 env -u CLAUDE_CODE_OAUTH_TOKEN CLAUDE_SESSION_NAMER=1 \
      "$claude_bin" -p --setting-sources local --no-session-persistence --strict-mcp-config --model haiku 2>>"$log_file"); then
      log "session_namer.refine.failed session=$session_id round=$round error=claude_exit duration_s=$(($(date +%s) - started))"
      exit 0
    fi
    if ! name=$(clean_name "$raw"); then
      log "session_namer.refine.failed session=$session_id round=$round error=bad_reply reply=$(printf '%s' "$raw" | tr -s '[:space:]' ' ' | cut -c1-80) duration_s=$(($(date +%s) - started))"
      exit 0
    fi
    full=$(with_issue "$issue" "$name")
    printf '%s' "$full" >"$refined_file.tmp" && mv "$refined_file.tmp" "$refined_file"
    log "session_namer.refine.ready session=$session_id round=$round name=$full duration_s=$(($(date +%s) - started))"
  ) </dev/null >/dev/null 2>&1 &
  disown
}

apply_refined() {
  local refined
  refined=$(cat "$refined_file")
  printf '%s' "$refined" >"$auto_file"
  rm -f "$refined_file"
  log "session_namer.refine.applied session=$session_id from=$1 to=$refined"
  emit_title "$refined"
}

input=$(cat)
if ! session_id=$(printf '%s' "$input" | jq -er '.session_id' 2>/dev/null); then
  log "session_namer.input.failed reason=no_session_id"
  exit 0
fi
title=$(printf '%s' "$input" | jq -r '.session_title // empty')
prompt=$(printf '%s' "$input" | jq -r '.prompt // empty')
transcript=$(printf '%s' "$input" | jq -r '.transcript_path // empty')
cwd="${CLAUDE_PROJECT_DIR:-}"
[ -z "$cwd" ] && cwd=$(printf '%s' "$input" | jq -r '.cwd // empty')
[ -z "$cwd" ] && cwd="$PWD"

auto_file="$state_dir/$session_id.auto"
refined_file="$state_dir/$session_id.refined"
issue_file="$state_dir/$session_id.issue"
round2_file="$state_dir/$session_id.round2"

if [ -n "$title" ]; then
  [ -s "$auto_file" ] && [ "$title" = "$(cat "$auto_file")" ] || exit 0
  if [ -s "$refined_file" ]; then
    apply_refined "$title"
    exit 0
  fi
  [ -e "$round2_file" ] && exit 0
  [ -f "$transcript" ] || exit 0
  case "$prompt" in "" | /* | "<"*) exit 0 ;; esac
  earlier=$(user_prompts "$transcript")
  [ "$(printf '%s\n' "$earlier" | sed '/^$/d' | wc -l)" -ge 1 ] || exit 0
  touch "$round2_file"
  material="User requests, oldest first:
$(printf '%s\n' "$earlier" | tail -n 5)
$(printf '%s' "$prompt" | tr -s '[:space:]' ' ' | cut -c1-400)

Latest assistant reply:
$(last_reply "$transcript")"
  if [ -e "$issue_file" ]; then issue=$(cat "$issue_file"); else issue=$(find_issue "$earlier"); fi
  refine_in_background "$material" "$issue" 2
  exit 0
fi

[ -z "$prompt" ] && exit 0
case "$prompt" in /* | "<"*) exit 0 ;; esac

task=$(task_part "$prompt")
issue=$(find_issue "$task" "$prompt")
printf '%s' "$issue" >"$issue_file"

stopwords=' a an the and or but for to of in on at by with from is are was were be been it this that these those i we you me my our your please can could would should will just like some what how why when where which who there here have has had do does did not no yes also so then than into about make need want let get got its all any more most very really thing things okay ok hey hi https http www com '
keywords=$(printf '%s' "$task" | sed -E 's/\b[A-Za-z]{2,6}-[0-9]{2,}\b//g; s#https?://[^[:space:]]+##g' | head -c 600 | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '\n' |
  awk -v sw="$stopwords" 'length($0) >= 3 && index(sw, " " $0 " ") == 0 && !seen[$0]++ { print; if (++n == 4) exit }' |
  paste -sd' ' -)
[ -z "$keywords" ] && keywords="new session"
keywords="$(printf '%s' "${keywords:0:1}" | tr '[:lower:]' '[:upper:]')${keywords:1}"
provisional=$(with_issue "$issue" "$keywords")
printf '%s' "$provisional" >"$auto_file"
log "session_namer.provisional.set session=$session_id name=$provisional"

refine_in_background "$(printf '%s' "$prompt" | head -c 2500)" "$issue" 1
for _ in $(seq 1 35); do
  [ -s "$refined_file" ] && break
  sleep 0.2
done
if [ -s "$refined_file" ]; then
  apply_refined "$provisional"
  exit 0
fi
emit_title "$provisional"
exit 0
