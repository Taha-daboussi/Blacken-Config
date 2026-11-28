# claude-tg

Sends a message, or a file with a caption, to your Telegram chat through your bot. Claude panes, dispatch, and background services use it to tell you that a task waits, failed, or is done.

```
claude-tg -t info|error|done [-r <repo>] [-s <service>] [-f <file>] "<message>"
```

- Each message starts with the repo (from git when `-r` is not given), the service (default `Claude Code`), and the type.
- `-f`: `.png`/`.jpg` go as a photo (a long image goes as a file), `.mp4` as a video, other files as a file. The message is the caption (max 1024 characters).
- Needs `curl`, `jq`, and `ffprobe` (for `-f` with an image).

## Install

1. `tools/claude-tg/install.sh [<bin dir>]` links the script into `<bin dir>` (default `~/.local/bin`). A plain file that is already there gets a `.bak.<time>` copy first.
2. Copy `env.example` to `~/.config/claude-telegram/env`, fill in the token and the chat id, and run `chmod 600` on it. Never commit that file. `CLAUDE_TG_ENV` points to another env file.
