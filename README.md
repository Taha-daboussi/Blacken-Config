# herdr-config

My settings for Herdr: the terminal app (`herdr`) and the desktop app (`herdr-app`).

## What is here

- `herdr/` goes to `~/.config/herdr`
  - `config.toml`: keys, theme, sidebar, toast, worktrees
  - `scripts/confirm-close-pane.sh`: asks before a pane closes (`prefix+x`)
  - `plugins/config/`: settings for the plugins
  - `plugins.txt`: the plugin repos and the commit that I use
- `herdr-app/` goes to `~/.config/herdr-app`
  - `settings.json`, `keys.json`, `programs.json`
  - `layouts/`: `main-drag` is the active layout
  - `themes/`
  - `mods/`: my own mods and mods that do not ship with Herdr
    - `agents-drag`, `pane-drag`, `tabs-drop`: drag an agent onto a tab to move it there
    - `herdr-md`, `over9k-usage`, `revive`, `space-switcher`, `tmux-prefix`

Not saved: logs, sockets, sessions, window state, telemetry, and the mods that ship with Herdr.

## Save the current settings

```sh
./sync.sh
git add -A && git commit -m "chore: sync settings" && git push
```

`sync.sh` writes `__HOME__` in place of your home folder path.

## Install on a new machine

1. Install `herdr` and `herdr-app`.
2. Run `./install.sh`. It makes a `.bak.<time>` copy of each settings file first.
3. Install the plugins in `herdr/plugins.txt`.
4. Restart `herdr-app`.
