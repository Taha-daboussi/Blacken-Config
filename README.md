# Blacken-Config

My settings, Claude Code parts, and workflows: Herdr (the terminal app `herdr` and the desktop app `herdr-app`), Claude Code hooks, and the `dispatch` workflow.

## Layout

```
config/       app settings, copied to ~/.config
claude/       Claude Code parts, copied to ~/.claude
workflows/    Claude Code workflows, each with its own README and install.sh
tools/        the repo scripts and the auto push units
```

- `config/herdr/` goes to `~/.config/herdr`
  - `config.toml`: keys, theme, sidebar, toast, worktrees
  - `scripts/confirm-close-pane.sh`: asks before a pane closes (`prefix+x`)
  - `plugins/config/`: settings for the plugins
  - `plugins.txt`: the plugin repos and the commit that I use
- `config/herdr-app/` goes to `~/.config/herdr-app`
  - `settings.json`, `keys.json`, `programs.json`
  - `layouts/`: `main-drag` is the active layout
  - `themes/`
  - `mods/`: my own mods and mods that do not ship with Herdr
    - `agents-drag`, `pane-drag`, `tabs-drop`: drag an agent onto a tab to move it there
    - `herdr-md`, `linear`, `over9k-usage`, `revive`, `space-switcher`, `tmux-prefix`
- `claude/hooks/session-namer.sh` goes to `~/.claude/hooks`. It names each Claude Code session, for example `DAW-16 E2E test copytrade limit entry`. Herdr shows these names in the agents list.
- `workflows/dispatch/`: one dispatcher session sends each task to one Claude pane in the right herdr tab, with its own git worktree; the pane runs the whole pipeline with role sub-agents. The private project files stay in `~/.config/dispatch/<repo>/BLACKFILE.md`, not here. See its README.
- `workflows/slack-gw/`: watch a Slack workspace live over one websocket, read it, and reply in threads as yourself, with no Slack app. Also the agent flow: watch, draft, reply in the thread. See its README.
- `workflows/discord-gw/`: the read-only Discord listener with the same `read` / `wait` / `thread` commands. See its README.
- `tools/`
  - `sync.sh`: copies the current settings into the repo
  - `install.sh`: copies the repo settings onto a machine
  - `autopush.sh` and `systemd/`: the auto push

Not saved: logs, sockets, sessions, window state, telemetry, and the mods that ship with Herdr.

## Save the current settings

```sh
tools/sync.sh
git add -A && git commit -m "chore: sync settings" && git push
```

`sync.sh` writes `__HOME__` in place of your home folder path.

## Auto push

A systemd user service pushes each settings change to GitHub.

- `blacken-config-autopush.path` starts the push a few seconds after a watched file or folder changes.
- `blacken-config-autopush.timer` also runs it every 15 minutes. This catches changes inside mod folders and in `workflows/`.
- `autopush.sh` runs `sync.sh`, checks the new lines for secrets, commits, and pushes. If it finds a possible secret, it pushes nothing and shows a desktop alert.

The service expects the repo at `~/Blacken-Config`. Turn it on:

```sh
ln -sf "$PWD"/tools/systemd/* ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now blacken-config-autopush.path blacken-config-autopush.timer
```

See the log: `journalctl --user -u blacken-config-autopush.service`

## Install on a new machine

1. Clone the repo to `~/Blacken-Config`.
2. Install `herdr` and `herdr-app`.
3. Run `tools/install.sh`. It makes a `.bak.<time>` copy of each settings file first.
4. Install the plugins in `config/herdr/plugins.txt`.
5. Add the session namer to `~/.claude/settings.json` as a `UserPromptSubmit` hook: `bash "$HOME/.claude/hooks/session-namer.sh"`.
6. Optional: run `workflows/dispatch/install.sh`.
7. Restart `herdr-app`.
