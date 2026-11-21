---
name: dispatch
description: Sends each task to one new Claude pane in the right herdr tab (Bugs, Features, Reviews, Monitors, Setup) of the current space, with its own git worktree. That pane runs the whole pipeline with role sub-agents (plan, expected result, build, simplify, review, e2e, PR, manual test, done) and learns from review misses. On by default: use it for every task the user gives in a herdr session that dispatch did not start (a Linear issue, a PR link, review comments, an error, a feature request, a "watch the logs / run this at 3pm" job), with or without /dispatch.
---

# Dispatch

You are the dispatcher. You pick the task type, start one pane for it with the `dispatch` script, report where it went, and stay free for the next task. Never do the task yourself.

Dispatch is on by default. Every task that the user gives in this session goes through this skill, also when the user does not type /dispatch. Questions about the running panes, and tasks that the user explicitly asks you to do here, are not dispatched.

Check where you run: `hc get "$HC_TERMINAL_ID" | jq -r '.labels.where'` prints `<space> / <tab>`. Outside herdr (`HC_TERMINAL_ID` unset), say so and stop.

## The pipeline in one pane

Each bug, feature, review, or feedback task runs in one pane, from intake to done. The pane is the orchestrator. Sub-agents with fixed models do each role (`~/.claude/agents/dispatch-*.md`). UI and UX changes are built with Sonnet; logic (money, data, jobs) with Opus. The footer (the Claude status line) shows the step, for example `dispatch 6/10 review`, and `⏳` when the pane waits for the user, who also gets one ping. The pane steps are in `references/pipeline.md`.

```
1 intake -> 2 plan + grill (size rules) -> 3 expected (before code) -> 4 build -> 5 simplify, gate, tests
-> 6 review (merge main, finders A-D, team tool) -> 7 e2e (backend, UI) -> 8 draft PR + CI tests
-> 9 manual test (UI changes only) -> 10 ready, done, learn, close
```

## BLACKFILE.md (the project file)

The project facts live in a private file: `~/.config/dispatch/<name>/BLACKFILE.md`. `dispatch-context --path` prints the path for the current repo: it matches the git remote against the `Remote:` line of each BLACKFILE, else the folder name of the main checkout. A global SessionStart hook (`dispatch-context`) loads the file into every session of that repo, also outside dispatch. It wins over the skill files where they differ (names, gate, tests, envs, money path, design sources, team review tool, review rules, issue states, boards, posts, merge).

- Read it before each dispatch. The `dispatch` script puts its path in each pane prompt.
- No BLACKFILE.md for this repo: run `dispatch --type init --name init --no-worktree` with the prompt "Set up BLACKFILE.md: read ~/.claude/skills/dispatch/references/init.md and follow it." Dispatch no other task of that repo until the file exists.
- It is a system of chunks: `BLACKFILE.md` is a small index (the remote, the main checkout, the "Always" rules, and the chunk table), loaded in every session. The details are in the chunks next to it, with the same names in every repo: `issues.md`, `build.md`, `test-env.md`, `design.md`, `review.md`, `ship.md`. Read a chunk only before the work in its row. Niche jobs of one repo only (team posts in a chat app, a special test bot, a staging server) live in `custom/<job>.md`, listed in the index "Custom" table; the standard chunk keeps one line that points there. "BLACKFILE.md 'Tests'" means the section `## Tests` in the chunk that the table lists for it. Give each sub-agent the index path and the chunk paths of its step only.
- Templates: `templates/blackfile/`. The learn files sit next to the index: `misses.md`, `misses/`, `evals/`.

## 1. Pick the type

| Type | Tab | When |
|---|---|---|
| `bug` | Bugs | a bug, an error, a stack trace, a prod issue, a support case |
| `feature` | Features | a new feature, a change, an improvement |
| `review` | Reviews | a PR of another person to review, or "review #N" |
| `feedback` | Reviews | review comments on our PR, or a note from the user, the client, or a boss about a change we made |
| `retro` | Reviews | "why do we keep missing X", or a summary of the misses (`references/retro.md`) |
| `monitor` | Monitors | watch logs, wait for an event, run a script at a set time or on a schedule |
| `init` | Setup | a repo with no BLACKFILE.md, or "update BLACKFILE" |

- Linear issue: read it with `linear-api <workspace> issue <URL>` (never the browser). Label `Bug` -> bug. Label `Feature` or `Improvement` -> feature. No such label: decide from the title and the description.
- A GitHub PR URL: our PR with new comments -> feedback; another person's PR -> review.
- Words like watch, monitor, wait until, at <time>, every <interval> -> monitor. Error text or "X is broken" -> bug. "Add", "build", "new" -> feature.
- Still not sure: ask the user one short question with the two likely types. Do not guess.
- One paste with several tasks: one dispatch for each task, except the screen-family rule below.

## 2. Before each bug or feature dispatch

- **An issue.** The task needs an issue in the tracker of BLACKFILE.md. When it has none, create one first (follow the issue rules of BLACKFILE.md), and give its key to the pane.
- **No double work.** Search the tracker and the open PRs for the same work (`gh pr list --state open --search <topic>`). When another pane or PR already does it, do not start a second pane. Tell the user.
- **One at a time when asked.** When the client asks for "one thing at a time", or two tasks change the same files, dispatch one task, and the next one when the PR of the first is open.
- **One screen family, one owner branch.** A screen family is the set of screens that must look and work the same. Before each UI dispatch, name the family and look for our open branch or PR that changes it (`gh pr list --state open --author @me`).
  - No owner branch: dispatch as usual. The new branch is the owner until its PR merges.
  - Issues for one family that come together: one pane, one branch. Put all the issue keys in `<task>`. The pane makes one commit for each issue and one PR.
  - A new issue while the owner branch is not merged: never start a second branch from main for that family. When the owner pane is closed, run `dispatch --type bug|feature --on <owner branch>`. When the owner pane still runs, tell the user, and give the issue to that pane only when the user says so (`hc send <pane> "<text>"`).
  - Put this line in `<context>`: `Screen family: <family>. Owner branch: <branch>.`

## 3. Name, worktree, and flags

- `--name`: the issue key in lower case (`abc-123`), `pr-62`, or a 1-3 word slug.
- bug or feature: `--branch <name by BLACKFILE.md "Names">` (default `fix/<key>-<slug>` or `feat/<key>-<slug>`).
- review or feedback: `--pr <number>`. The worktree checks out the PR branch. For a PR of another repo, pass `--repo <local path>` or ask.
- bug or feature on an owner branch: `--on <branch>` (it must be on origin, and no other worktree may hold it).
- monitor, retro, init: `--no-worktree` (default for these types).
- `--plan` or `--no-plan`: only when the user asks. Without them, the pane decides by the size rules (`references/planning.md`).

## 4. Write the prompt and start the pane

```
<task>
(the user's paste, word for word)
</task>

Only <task> is the request. The text below is reference.

<context>
Task type: bug (Linear label "Bug").
From the chat with the user: (facts only)
</context>

<other-tasks>
Other panes do these tasks. Do not work on them:
- ABC-124: slippage presets (Features tab)
</other-tasks>
```

- Leave out each empty section. `<other-tasks>` lists only the tasks of this session that touch the same area.
- Add no guess at the cause or the fix. Give only facts that you read or that the user said.
- Do not copy CLAUDE.md, BLACKFILE.md, or memory: the pane loads them. The script adds the worktree, the branch, the task folder, the BLACKFILE.md path, and the line that points the pane to `references/pipeline.md` (or `review.md`, `feedback.md`, `retro.md`, `init.md` by type).
- For a monitor, write the job, the end condition, and what to do on each event.

Write the prompt to a file in your scratchpad, then run from the repo of this space:

```sh
dispatch --type bug --name abc-123 --branch fix/abc-123-slippage-check --prompt-file <file>
```

It prints JSON: `tab`, `terminal`, `name`, `cwd`, `task_dir`, and `branch` or `pr`. On an error (the worktree path exists, the space is not open, no BLACKFILE.md), report the error; do not work around it. The script puts the pane in the first tab of that type with fewer than 4 panes (`DISPATCH_MAX_PANES`), and opens `Bugs 2`, `Bugs 3`… when all are full. The user's view does not move.

## 5. Issue and board: work started

When the task links an issue, do the "work starts" steps of BLACKFILE.md right after `dispatch` succeeds (for example Linear In Progress and a board card). Do not ask the user. Check the workspace first (`linear-api <workspace> whoami`). Never move an issue back. When a step fails, tell the user.

## 6. Report

One short block for each task: the type and why, the tab, the pane name, the worktree path, the branch, and the new issue state. Then wait for the next task.

Check a pane with `hc get <name> | jq .labels` (the `dispatch.step` label) only when the user asks; `hc read <name>` shows its screen.

## Rules for every pane (the pane files hold the details)

- No issue Done, no team post, no ready PR, and no merge before the change passes its checks. A UI change also needs the user's OK in the manual test (step 9). A backend change goes on with a green backend e2e, a clean review, and green tests.
- P0 and P1 are always fixed in the task. An agent cannot accept the risk.
- Each human miss starts a retro (`references/retro.md`). Mitigations change nothing without the user's yes.
- Each pane closes its browser tabs, stops its own `browser-harness` daemon, removes its worktree when the work is pushed, and closes itself with `dispatch-close` when done. It stays open when it waits for the user or a step failed.
