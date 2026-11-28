# dispatch

A Claude Code workflow for herdr (or tmux). One dispatcher session takes each task (an issue, a PR, review comments, an error, a "watch the logs" job) and starts one Claude pane for it in the right herdr tab, or in a window of the tmux session `dispatch` outside herdr, with its own git worktree. That pane runs the whole pipeline with role sub-agents, each with a fixed model:

```
1 intake -> 2 plan + grill (only for big tasks) -> 3 expected result (written before the code)
-> 4 build -> 5 simplify, gate, scoped tests -> 6 review (merge main, finders A-D, the team review tool)
-> 7 e2e (backend run, or UI runner + text diff + fresh judge) -> 8 draft PR + CI tests
-> 9 manual test (UI changes only) -> 10 ready, done, learn from misses, close
```

The Claude status line shows the step of each pane (`⚙ dispatch 6/10 review`), and `⏳` with one ping (`claude-tg`, when installed) when the pane waits for you.

When a person finds a problem after a step said "done" (a review comment, a UI note, a bug in the manual test), a retro finds which step missed it and why, proposes the strongest fix for that class (a check that always runs, a pipeline change, or a project rule), and proves it on the old commit with an eval case.

## Agents, models and effort

The pane itself runs plain `claude`, so it uses the default model and effort of the session. The `dispatch` script sets no `--model`. Each role sub-agent has its model and effort in `agents/<name>.md`.

| # | Step | Who does it | Model | Effort |
|---|------|-------------|-------|--------|
| 1 | Intake | the pane | session default | session default |
| 2 | Plan | `dispatch-planner` | Opus | high |
| 2 | Plan check | `dispatch-critic` | Opus | high |
| 3 | Expected result | `dispatch-spec` | Sonnet | medium |
| 4 | Build (logic) | `dispatch-builder` | Opus | high |
| 4 | Build (UI and UX) | `dispatch-builder` with `model: sonnet` | Sonnet | high |
| 5 | Simplify, gate, rule scan | the pane (`/simplify`) | session default | session default |
| 6 | Review finders A-D, final check | `dispatch-reviewer` | Opus | high |
| 6 | Disprove, re-review, main-changes list | `dispatch-reviewer` with `model: sonnet` | Sonnet (Opus for a money path) | high |
| 6 | Fixes | `dispatch-builder` | Opus, or Sonnet for UI-only fixes | high |
| 7 | Backend e2e | `dispatch-e2e-backend` | Sonnet | medium |
| 7 | UI e2e runner (desktop and phone) | `dispatch-e2e-ui` | Sonnet | medium |
| 7 | UI judge | `dispatch-ui-judge` | Sonnet | medium |
| 8 | Draft PR | the pane | session default | session default |
| 9 | Manual test | the user and the pane | session default | session default |
| 10 | Done | the pane | session default | session default |
| learn | Read PR comments | `dispatch-feedback` | Sonnet | medium |
| learn | Retro | `dispatch-retro` | Opus | high |

The "Models" section of the `BLACKFILE` of a project can override these values. Example: a project can force Opus for every review call.

## What is here

- `skill/` goes to `~/.claude/skills/dispatch` (symlink)
  - `SKILL.md`: the dispatcher
  - `references/`: the pane steps (`pipeline.md`), `planning.md`, `review.md`, `e2e-ui.md`, `e2e-backend.md`, `ui-rules.md`, `feedback.md`, `retro.md`, `init.md`, `coding-principles.md`
  - `templates/`: `BLACKFILE.md`, `expected.md`, `miss.md`, `eval.md`
- `agents/` go to `~/.claude/agents` (symlinks; keep them in user scope: Claude Code skips the frontmatter hooks of an agent in a project folder that is not trusted, so the `expected.md` guard would not run): `dispatch-planner`, `dispatch-critic`, `dispatch-spec`, `dispatch-builder`, `dispatch-reviewer`, `dispatch-e2e-backend`, `dispatch-e2e-ui`, `dispatch-ui-judge`, `dispatch-feedback`, `dispatch-retro`
- `skills/`: `grilling`, `domain-modeling`, `grill-with-docs`, vendored from [mattpocock/skills](https://github.com/mattpocock/skills) (MIT, commit `abeeaf9`)
- `bin/` goes to `~/.local/bin` (symlinks)
  - `dispatch`: makes the worktree and the task folder, picks or makes the tab, and starts `claude` with the prompt
  - `dispatch-step`: records the step of a pane (footer, herdr label or tmux window option, step log, ping on wait); in herdr, at step 9 `manual-test` it moves the pane to the Manual Test tab
  - `dispatch-pick-tab`: picks the tab with room for the next pane of a type (`UI Bugs`, `UI Bugs 2`, ...)
  - `dispatch-title`: sets the pane title of the calling task pane (step 8 adds the PR number)
  - `dispatch-move-tab`: moves the calling herdr pane to another tab of its space; the program keeps running
  - `dispatch-rule-scan`: checks the added lines of the branch against the "Rule scan" lines of `build.md` (step 5, no model)
  - `dispatch-guard-role`: the hook of each sub-agent: no push, no GitHub, Linear or chat write; read-only roles cannot change the worktree
  - `dispatch-wt-check`: proves that a read-only sub-agent left the worktree as it was
  - `dispatch-ui-diff`: compares the expected screen with the DOM text of a shot, plus a pixel diff
  - `dispatch-knowledge`: prints the local path of the business library that the BLACKFILE `Knowledge:` line names; clones it to `~/knowledge/<repo>` when missing, pulls it when present, and checks its entry files (`INDEX.md`, `AGENTS.md`, `HOW-TO-UPDATE.md`)
  - `dispatch-count`: counts the working panes of a space and reads the limit (see "Limit of working panes")
  - `dispatch-queue`: lists, starts and drops the tasks that `dispatch` held back at the limit
  - `dispatch-pr-overlap`: lists the other open PRs whose added lines use a function that this branch changed (step 8, no model)
  - `dispatch-eval`: prepares, runs (step `check`) and records the eval cases of the learn loop, also against a draft (`--skill`, `--agents`, `--config`) and across all repos (`--all-repos`)
  - `dispatch-draft`: puts a learn-loop mitigation on a draft branch (skill repo or private config repo), then applies or drops it after the user answers
  - `dispatch-guard-expected`: the hook that stops the builder from editing `expected.md`
  - `dispatch-close`: closes the pane of a dispatch task when it is done
  - `dispatch-stats`: the time per step of one task (wall, wait, active, sub-agents, browser), from `steps.tsv` and the Claude session logs
- `statusline/dispatch-segment.sh` goes to `~/.local/bin/dispatch-statusline`: the footer part
- `hooks/dispatch-main.sh` goes to `~/.claude/hooks`. Optional `SessionStart` hook: it tells each herdr session that `dispatch` did not start that it is the dispatcher.

## Limit of working panes

At most 3 panes work at the same time in one herdr space (one tmux session outside herdr). The limit protects your focus: you cannot watch ten panes at once.

- A new task above the limit is **queued**. `dispatch` prints `{"queued": true, ...}` and the message "queued. 3 of 3 panes are working in this space. This task starts when a pane finishes or waits for you."
- The queue starts the oldest task by itself when a pane finishes (`dispatch-close`), reaches step 10, or waits for you (`dispatch-step --wait`).
- These panes do not count: a pane that waits for you, a pane at step 10, and monitor panes. Monitor and init tasks are never queued.
- To start a task at once, add `--force`. To see the queue, run `dispatch-queue list`. To delete a task from it, run `dispatch-queue drop <file>`.
- A pane that waits for you counts again when it works again. So the number can be above the limit for a short time. The limit is checked only when a task starts.

Each user sets the number (0 means no limit). The first value that exists wins:

1. The environment variable `DISPATCH_MAX_WORKING`.
2. The line `max_working=<n>` in `~/.config/dispatch/config`.
3. The default, 3.

Held tasks are in `~/.local/share/dispatch/queue/<space>/`. A task that fails to start stays there as a `.failed` file, and `dispatch-queue list` shows it.

## Project files (private)

The skill is generic. The facts of one repo (branch names, the gate, the tests, the test envs, the money path, design sources, the team review tool, learned review rules, issue states, boards, team posts, merge) go in a private file:

```
~/.config/dispatch/<repo>/BLACKFILE.md
~/.config/dispatch/<repo>/misses.md, misses/, evals/
```

`<repo>` is the folder name of the main checkout. `dispatch --type init` writes a draft from the repo and asks you only the gaps. Never put these files in this repo.

## Install

1. Install the required tools: `git`, `jq`, `claude`, and a runner: `herdr` with `herdr-app` (it gives `hc`), or `tmux`. `install.sh` stops when one is missing.
2. Install the optional tools for the steps that use them (`install.sh` lists the missing ones): `gh` (PRs), `python3` (`dispatch-stats`, `dispatch-ui-diff`), ImageMagick (`magick`) and `tesseract` (UI e2e), `browser-harness` (web UI e2e), `claude-tg` (the ping), `timeout`, `flock`.
3. Run `./install.sh`. It links the skill, the agents, the vendored skills, the scripts and the hook, and adds the `dispatch-context` SessionStart hook to `~/.claude/settings.json` (`--no-hook` skips that). It moves an existing file to `~/.local/state/dispatch/install-backup/<time>/` first.
4. Add `dispatch-statusline` to your Claude status line command.
5. Optional: add the dispatcher `SessionStart` hook that `install.sh` prints (herdr only).

The skill also uses these tools when they are there: `linear-api` (Linear), `claude-tg` (the ping), and `browser-harness` (the UI e2e).

## Use

In a herdr session, give the task to Claude, or type `/dispatch <task>`. Outside herdr, type `/dispatch <task>`; the pane opens in the tmux session `dispatch` (`tmux attach -t dispatch`). The dispatcher runs, for example:

```sh
dispatch --type be-bug --name abc-123 --branch fix/abc-123-slippage --prompt-file prompt.md
dispatch --type feedback --name pr-62 --pr 62 --prompt-file prompt.md
```

Run `dispatch --help` for all options.
