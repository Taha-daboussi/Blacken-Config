# dispatch

A Claude Code workflow for herdr. One dispatcher session takes each task (a Linear issue, a PR, an error, a "watch the logs" job) and starts a new Claude agent for it in the right herdr tab, with its own git worktree. The agents hand off to each other: fix -> review -> manual test.

## What is here

- `skill/` goes to `~/.claude/skills/dispatch` (symlink)
  - `SKILL.md`: the dispatcher steps, the hand-off chain, the spec checks, and the manual test
  - `review.md`: the review agent steps (finders, disprove, fix, re-review, gate)
- `bin/` goes to `~/.local/bin` (symlinks)
  - `dispatch`: makes the worktree, picks or makes the tab (`Bugs`, `Features`, `E2E`, `Reviews`, `Manual Test`, `Monitors`), and starts `claude` with the prompt
  - `dispatch-close`: closes the pane of a dispatch agent when its step is done
  - `dispatch-stats`: the time and token table of one task, from the Claude session logs
- `hooks/dispatch-main.sh` goes to `~/.claude/hooks` (symlink). Optional `SessionStart` hook: it tells each herdr session that `dispatch` did not start that it is the dispatcher.
- `overlays/example.md`: the template for a private repo overlay.

## Repo overlays (private)

The skill here is generic. The rules of one repo (branch names, the gate, the test bot or test site, Linear and board steps, team posts, client names, channel ids, hosts) go in a private file:

```
~/.config/dispatch/overlays/<repo>.md
```

`<repo>` is the folder name of the main checkout. When the file exists, the dispatcher reads it first and tells each agent to read it. It wins over `SKILL.md` and `review.md`. Never put an overlay in this repo.

## Install

1. Install `herdr`, `herdr-app` (it gives `hc`), `claude`, `gh`, `jq`, and `git`.
2. Run `./install.sh`. It links the skill, the scripts and the hook. It moves an existing file to `~/.local/state/dispatch/install-backup/<time>/` first.
3. Optional: add the `SessionStart` hook that `install.sh` prints.
4. Optional: add a repo overlay from `overlays/example.md`.

The skill also uses these tools when they are there: `linear-api` (Linear), `claude-tg` (a ping to the user), and `browser-harness` (browser tests).

## Use

In a herdr session, give the task to Claude, or type `/dispatch <task>`. The dispatcher runs, for example:

```sh
dispatch --type bug --name abc-123 --branch fix/abc-123-slippage --prompt-file prompt.md
```

Run `dispatch --help` for all options.
