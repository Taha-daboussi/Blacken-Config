#!/usr/bin/env bash
set -euo pipefail
src="$(cd "$(dirname "$0")" && pwd)/claude-tg"
bin="${1:-$HOME/.local/bin}"
dest="$bin/claude-tg"
mkdir -p "$bin"
if [ -e "$dest" ] && [ ! -L "$dest" ]; then
  cp -a "$dest" "$dest.bak.$(date +%s)"
fi
ln -sfn "$src" "$dest"
echo "linked $dest -> $src"
env_file="${CLAUDE_TG_ENV:-$HOME/.config/claude-telegram/env}"
[ -r "$env_file" ] || echo "missing $env_file: copy env.example there, fill it in, and run chmod 600 on it"
