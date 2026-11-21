#!/usr/bin/env bash
set -euo pipefail
repo="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo"

fail() {
  echo "blacken-config autopush: $1" >&2
  notify-send -u critical "blacken-config autopush" "$1" 2>/dev/null || true
  exit 1
}

sleep "${AUTOPUSH_DELAY:-5}"
./tools/sync.sh >/dev/null || fail "sync.sh failed"

if [ -n "$(git status --porcelain)" ]; then
  git add -A
  pattern='BEGIN [A-Z ]*PRIVATE KEY|ssh-(rsa|ed25519) AAAA|sk-ant-[A-Za-z0-9_-]{10}|gh[pousr]_[A-Za-z0-9]{20}|github_pat_[A-Za-z0-9_]{20}|AKIA[0-9A-Z]{16}|xox[abpr]-[A-Za-z0-9-]{10}|eyJhbGciOi|@gmail\.com|100\.[0-9]+\.[0-9]+\.[0-9]+'
  if hits="$(git diff --cached -U0 | grep '^+' | grep -v '^+++' | grep -En "$pattern")"; then
    git reset -q
    echo "$hits" >&2
    fail "possible secret in Blacken-Config, nothing pushed. Check: git -C $repo diff"
  fi
  git commit -qm "chore: auto sync settings" || fail "git commit failed"
  echo "committed: $(git log -1 --stat --format=%h | tail -n +2 | tr '\n' ' ')"
fi

if [ -n "$(git rev-list @{u}..HEAD)" ]; then
  git push -q || fail "git push failed, will try again on the next change"
  echo "pushed $(git rev-parse --short HEAD)"
fi
