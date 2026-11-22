# dispatch

A Claude Code workflow for herdr. One dispatcher session takes each task (a Linear issue, a PR, review comments, an error, a "watch the logs" job) and starts one Claude pane for it in the right herdr tab, with its own git worktree. That pane runs the whole pipeline with role sub-agents, each with a fixed model:

```
1 intake -> 2 plan + grill (only for big tasks) -> 3 expected result (written before the code)
-> 4 build -> 5 simplify, gate, scoped tests -> 6 review (merge main, finders A-D, the team review tool)
-> 7 e2e (backend run, or UI runner + text diff + fresh judge) -> 8 draft PR + CI tests
-> 9 manual test (UI changes only) -> 10 ready, done, learn from misses, close
```

The Claude status line shows the step of each pane (`⚙ dispatch 6/10 review`), and `⏳` with one ping (`claude-tg`, when installed) when the pane waits for you.

When a person finds a problem after a step said "done" (a review comment, a UI note, a bug in the manual test), a retro finds which step missed it and why, proposes the strongest fix for that class (a check that always runs, a pipeline change, or a project rule), and proves it on the old commit with an eval case.

## What is here

- `skill/` goes to `~/.claude/skills/dispatch` (symlink)
  - `SKILL.md`: the dispatcher
  - `references/`: the pane steps (`pipeline.md`), `planning.md`, `review.md`, `e2e-ui.md`, `e2e-backend.md`, `ui-rules.md`, `feedback.md`, `retro.md`, `init.md`, `coding-principles.md`
  - `templates/`: `BLACKFILE.md`, `expected.md`, `miss.md`, `eval.md`
- `agents/` go to `~/.claude/agents` (symlinks; keep them in user scope: Claude Code skips the frontmatter hooks of an agent in a project folder that is not trusted, so the `expected.md` guard would not run): `dispatch-planner`, `dispatch-critic`, `dispatch-spec`, `dispatch-builder`, `dispatch-reviewer`, `dispatch-e2e-backend`, `dispatch-e2e-ui`, `dispatch-ui-judge`, `dispatch-feedback`, `dispatch-retro`
- `skills/`: `grilling`, `domain-modeling`, `grill-with-docs`, vendored from [mattpocock/skills](https://github.com/mattpocock/skills) (MIT, commit `abeeaf9`)
- `bin/` goes to `~/.local/bin` (symlinks)
  - `dispatch`: makes the worktree and the task folder, picks or makes the tab, and starts `claude` with the prompt
  - `dispatch-step`: records the step of a pane (footer, herdr label, step log, ping on wait); at step 9 `manual-test` it moves the pane to the Manual Test tab
  - `dispatch-pick-tab`: picks the tab with room for the next pane of a type (`UI Bugs`, `UI Bugs 2`, ...)
  - `dispatch-move-tab`: moves the calling pane to another tab of its space; the program keeps running
  - `dispatch-ui-diff`: compares the expected screen with the DOM text of a shot, plus a pixel diff
  - `dispatch-pr-overlap`: lists the other open PRs whose added lines use a function that this branch changed (step 8, no model)
  - `dispatch-eval`: prepares, runs (step `check`) and records the eval cases of the learn loop, also against a draft (`--skill`, `--agents`, `--config`) and across all repos (`--all-repos`)
  - `dispatch-draft`: puts a learn-loop mitigation on a draft branch (skill repo or private config repo), then applies or drops it after the user answers
  - `dispatch-guard-expected`: the hook that stops the builder from editing `expected.md`
  - `dispatch-close`: closes the pane of a dispatch task when it is done
  - `dispatch-stats`: the time table of one task, from the Claude session logs
- `statusline/dispatch-segment.sh` goes to `~/.local/bin/dispatch-statusline`: the footer part
- `hooks/dispatch-main.sh` goes to `~/.claude/hooks`. Optional `SessionStart` hook: it tells each herdr session that `dispatch` did not start that it is the dispatcher.

## Project files (private)

The skill is generic. The facts of one repo (branch names, the gate, the tests, the test envs, the money path, design sources, the team review tool, learned review rules, issue states, boards, team posts, merge) go in a private file:

```
~/.config/dispatch/<repo>/BLACKFILE.md
~/.config/dispatch/<repo>/misses.md, misses/, evals/
```

`<repo>` is the folder name of the main checkout. `dispatch --type init` writes a draft from the repo and asks you only the gaps. Never put these files in this repo.

## Install

1. Install `herdr`, `herdr-app` (it gives `hc`), `claude`, `gh`, `jq`, `git`, `python3`, ImageMagick (`magick`) and `tesseract`.
2. Run `./install.sh`. It links the skill, the agents, the vendored skills, the scripts and the hook. It moves an existing file to `~/.local/state/dispatch/install-backup/<time>/` first.
3. Add `dispatch-statusline` to your Claude status line command.
4. Optional: add the `SessionStart` hook that `install.sh` prints.

The skill also uses these tools when they are there: `linear-api` (Linear), `claude-tg` (the ping), and `browser-harness` (the UI e2e).

## Use

In a herdr session, give the task to Claude, or type `/dispatch <task>`. The dispatcher runs, for example:

```sh
dispatch --type be-bug --name abc-123 --branch fix/abc-123-slippage --prompt-file prompt.md
dispatch --type feedback --name pr-62 --pr 62 --prompt-file prompt.md
```

Run `dispatch --help` for all options.
