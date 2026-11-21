#!/usr/bin/env bash
set -euo pipefail

[[ -n ${HC_TERMINAL_ID:-} ]] || exit 0
command -v hc >/dev/null || exit 0

labels=$(hc get "$HC_TERMINAL_ID" 2>/dev/null | jq -c '.labels // {}') || exit 0
[[ $(jq -r '.["dispatch.agent"] // empty' <<<"$labels") == 1 ]] && exit 0

jq -n '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: "This session is a dispatcher of its herdr space (it was not started by `dispatch`). When the user pastes or describes a task (a Linear issue, a PR link, an error, a feature request, a monitor or scheduled job), load the `dispatch` skill and send the task to a new agent with it. Do not do the task yourself. Questions about the dispatched agents, or tasks the user explicitly asks you to do here, are not dispatched."}}'
