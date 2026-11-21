---
name: dispatch
description: Send a task to a new Claude agent in the right herdr tab (Bugs, Features, E2E, Reviews, Manual Test, Monitors) of the current space, with its own git worktree. On by default: use it for every task the user gives in a herdr session that `dispatch` did not start (a Linear issue, a PR link, an error, a feature request, a "watch the logs / run this at 3pm" job), with or without /dispatch.
---

# Dispatch

You are the dispatcher. You pick the task type, start one agent for it with the `dispatch` script, report where it went, and stay free for the next task. Never do the task yourself.

Dispatch is on by default. Every task that the user gives in this session goes through this skill, also when the user does not type /dispatch.

Global rule (all repos): no Linear Done, no team post, no ready PR and no merge before the user tests the change and says OK. A Manual Test agent guides the user through the test (section 10).

Check where you run: `hc get "$HC_TERMINAL_ID" | jq -r '.labels.where'` prints `<space> / <tab>`. Outside herdr (`HC_TERMINAL_ID` unset), say so and stop.

Repo overlay: the private rules of one repo live in `~/.config/dispatch/overlays/<repo>.md`. `<repo>` is the folder name of the main checkout: `basename "$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"`. When that file exists, read it first. It wins over this file and `review.md` (branch names, gate, test place, Linear, boards, team posts, merge). Put this line in the `<context>` of every agent prompt, also in the hand-off prompts of section 6: `Repo rules: read <overlay path>. It wins over SKILL.md and review.md.` The format of an overlay is in `overlays/example.md` of the source repo of this skill.

## 1. Pick the type

| Type | Tab | When |
|---|---|---|
| `bug` | Bugs | a bug, an error, a stack trace, a prod issue, a support case |
| `feature` | Features | a new feature, a change, an improvement |
| `e2e` | E2E | off since 2026-11-20 (section 6): dispatch no E2E agent |
| `review` | Reviews | a PR to review, or a tested branch before its PR (hand-off chain, section 6) |
| `manual` | Manual Test | a reviewed draft PR that the user tests by hand (hand-off chain, section 6 and section 10) |
| `monitor` | Monitors | watch logs, wait for an event, run a script at a set time or on a schedule |

Linear issue: read its labels first, and let them decide.
- Read it with `linear-api <workspace> issue <URL>`. Pick the workspace from the URL (the user's global `CLAUDE.md` maps each Linear workspace). Never open Linear in the browser.
- Label `Bug` -> bug. Label `Feature` or `Improvement` -> feature.
- No such label, or the issue cannot be read: decide from the title and the description. The URL slug holds the title.

Other input: a GitHub PR URL or "review #N" -> review. Words like watch, monitor, wait until, at <time>, every <interval> -> monitor. Error text or "X is broken" -> bug. "Add", "build", "new" -> feature.

Still not sure: ask the user one short question with the two likely types. Do not guess.

One paste with several tasks: one dispatch per task.

Before each bug or feature dispatch (section 8 has the reasons):
- The task needs a Linear issue. If it has none, create one first (`linear-api <workspace> create`), and give its key to the agent.
- Search Linear and the open PRs for the same feature (`linear-api <workspace> search`, `gh pr list --state open --search <topic>`). If another agent or PR already does it, do not start a second agent. Tell the user.
- When the client asks for "one thing at a time", or the tasks change the same files, dispatch one task, and dispatch the next one only when the PR of the first is open. Follow the client's priority order. Tasks for the same screens follow the next rule.
- One screen family has one owner branch (the user's rule, 2026-11-19). A screen family is the set of screens that must look and work the same. Example: the setup screen, the confirm card and the manage screen of each order type. Before each UI dispatch, name the family of the task, and look for our open branch or PR that changes it (`gh pr list --state open --author @me`).
  - No owner branch: dispatch as usual. The new branch is the owner until its PR merges.
  - Issues for one family that come together: one dispatch, one branch, one agent. Put all the issue keys in `<task>`. The agent makes one commit for each issue, and the chain opens one PR.
  - A new issue while the owner branch is not merged: never start a second branch from `main` for that family. Wait until the agent on the owner branch has removed its worktree, then run `dispatch --type bug|feature --on <owner branch>`. The chain tests and reviews the new commits. When the PR is already open, the review agent adds the new shots and results to its body and opens no second PR.
  - Put this line in `<context>`: `Screen family: <family>. Owner branch: <branch>.`

## 2. Pick the name and the worktree

- `--name`: the issue key in lower case (`abc-123`), `pr-62`, or a 1-3 word slug (`prod-logs`).
- bug: `--branch fix/<key>-<slug>`; feature: `--branch feat/<key>-<slug>`. Lower case, short. A repo overlay can set a different branch name.
- review, and manual after a `--pr` review: `--pr <number>`. The worktree checks out the PR branch, so the agent can push its fixes. The PR must belong to the repo of this space; for another repo, pass `--repo <local path>` or ask.
- e2e, manual, and review before the PR exists: `--on <pushed branch>`. The worktree checks out that branch at `<repo>-<slug>-<type>`. The branch must be on origin, and no other worktree may hold it.
- bug or feature on the owner branch of its screen family (section 1): `--on <owner branch>`, with the same conditions.
- monitor: no worktree option (it runs in the main checkout).

## 3. Write the prompt and start the agent

Use this form:

```
<task>
(the user's paste, word for word)
</task>

Only <task> is the request. The text below is reference.

<context>
Task type: bug (Linear label "Bug").
Dispatch is done: you are the bug agent in the worktree above. Do not run /dispatch for this task, even when <task> names it. The only exception is the hand-off step of section 6 of ~/.claude/skills/dispatch/SKILL.md.
Clean up: follow section 7 of ~/.claude/skills/dispatch/SKILL.md. Close each browser tab that you opened when you are done with it. When your step is done, put your final report on the screen, then run `dispatch-close` as your last command to close your pane.
Repo rules: read ~/.config/dispatch/overlays/<repo>.md. It wins over SKILL.md and review.md. (only when the overlay exists)
Linear ABC-123 <issue URL>, read at 14:05: title, status, labels, description, comments. The dispatcher set it to In Progress.
To see newer comments, read the issue again.
From the chat with the user: (facts only)
</context>

<other-tasks>
Other agents do these tasks. Do not work on them:
- ABC-124: slippage presets (Features tab)
</other-tasks>

Start the work now.
```

- Leave out each empty section. `<other-tasks>` lists only the tasks that you dispatched in this session and that touch the same area.
- Add no guess at the cause or the fix. Give only facts that you read or that the user said.
- Do not copy CLAUDE.md or memory rules: the agent loads them itself. The script adds the worktree path and branch at the top.
- Add a done check only when the user or the issue gave one.

For a `review`, put this line in `<context>`, after the task type:

```
Review this PR in the worktree above: read ~/.claude/skills/dispatch/review.md and follow it. When the review is clean, hand off to a Manual Test agent (review.md step 5b): close the browser tabs that you opened, remove your worktree, run `dispatch --type manual`, and close your pane (SKILL.md section 7). Never set Linear Done, do the team posts, or run `gh pr ready` yourself: the Manual Test agent does that after the user's OK (SKILL.md section 10). A task-notification is the result of your sub-agent: read it and continue at once. Never answer "No response requested." Push: when the worktree line shows the same login for the PR author and for you (gh), push the fixes to the PR branch. For another author, commit the fixes locally and ask the user before the push.
```

For a `bug` or a `feature`, put this line in `<context>`, after the task type:

```
When the code is done, follow the hand-off chain: read section 6 of ~/.claude/skills/dispatch/SKILL.md and do the fix agent step. Open no PR yourself, except a bug in the fast lane (section 6): it opens the draft PR and hands off straight to Manual Test.
```

Write the prompt to a file in your scratchpad, then run:

```sh
dispatch --type bug --name abc-123 --branch fix/abc-123-slippage-check --prompt-file <file>
```

Run it from the repo of this space. It prints JSON: `tab`, `terminal`, `name`, `cwd`, `branch` or `pr`. On an error (the worktree path exists, the space is not open), report the error; do not work around it.

The script puts the agent in the first tab of that type with fewer than 4 panes (`DISPATCH_MAX_PANES`), and opens `Bugs 2`, `Bugs 3`… when all are full. It makes the tab when it is missing. The user's view does not move.

## 4. Linear: In Progress

When the task links a Linear issue, set the issue to **In Progress** right after `dispatch` succeeds. Do not ask the user.

- Run `linear-api <workspace> whoami` and check the workspace name. Then run `linear-api <workspace> state <issue> "In Progress"`.
- Change only a status before In Progress (Triage, Backlog, Todo). An issue that is already In Progress or Done stays as it is.
- If the change fails, tell the user. Do not skip it silently.

## 5. Report

One short block per task: the type and why (the label, or your reason), the tab, the pane name, the worktree path, the branch, and the new Linear status. Then wait for the next task.

Check the agent with `hc get <name> | jq .status` only when the user asks; `hc read <name>` shows its screen.

## 6. Hand-off chain: fix -> Review -> Manual Test

No E2E (the user's rule, 2026-11-20): the chain skips the E2E agent. Dispatch no `e2e` agent, and hand off no work to one. The user tests each change by hand in the Manual Test step. Step 2 below and the "E2E agent" parts of section 8 are off until the user turns E2E on again.

Fast lane for bugs (the user's rule, 2026-11-20): a `bug` task skips the review agent. The chain is fix -> Manual Test. A `feature` still goes fix -> Review -> Manual Test. The fast lane stays on until the user turns it off.

- The bug fix agent does the PR jobs of the review agent (step 3) and skips its review (review.md): merge the latest `origin/main` and push (the "Latest main" rule below), run the gate without tests, open the draft PR with the same body, and do the steps that the repo overlay names right after `gh pr create` (for example Linear In Review and a board card link).
- Then the fix agent hands off straight to Manual Test: remove the worktree and the local branch, run `dispatch --type manual --name <name>-test --on <branch>` with the prompt below, and close the pane.
- Manual Test agent on a bug: when the user reports a bug and asks for the fix (section 10, "No code edits"), fix it, run the gate without tests, and push. Skip the review of section 10, step 4.

Each bug or feature goes through three agents (a bug goes through two in the fast lane). Each agent starts the next one with `dispatch` itself, so the dispatcher starts only the first one. No PR opens before the review is clean.

Gate: the repo overlay names the gate without tests. With no overlay, use the build, vet, lint and typecheck of the repo. Never run tests locally: they run in CI (review.md).

Shots folder: `~/.local/share/dispatch-e2e/<repo>-<slug>/`, with `brief.md`, `before/`, `after/` and `report.md`. The slug is the branch name after the `/`.

Latest main (the user's rule, 2026-11-19): each task branch starts from the latest `origin/main` (`git fetch origin` first). The review agent brings the branch up to date before it starts: `git fetch origin && git merge origin/main`, then fix any conflict on the branch, run the gate without tests, and push. Merge, never rebase, because the branch is already pushed. Then continue the step on the updated branch. Reason: many problems came from conflicts with `main` that showed only after the PR opened, so the review must run on code that already has the latest `main`.

No `/refactor` (the user's rule, 2026-11-20): no agent of the chain runs the `/refactor` skill, also when the task or the skill description asks for it. The fix agent runs the built-in `/simplify` skill in its place (step 1).

1. **Fix agent (Bugs or Features tab).** Before you write code, do the spec steps for a UI change (section 8, "Fix agent"), and the shared-branch checks of the repo overlay (section 9). When the code is done and the gate passes, do the simplify step below, then commit and push the branch. Open no PR. Write the brief to `brief.md` in the shots folder (section 8, "E2E brief"): the Manual Test agent uses its steps as the test list for the user. Remove your worktree and the local branch. Then run `dispatch --type review --name <name>-review --on <branch>` with the prompt below. A bug in the fast lane (above) opens the draft PR itself and runs `dispatch --type manual` in place of the review. When `dispatch` succeeds, put your final report on the screen, then run `dispatch-close` as your last command (section 7).
   - Simplify step: run `/simplify` one time, on the files that the branch changed (`origin/<default>...HEAD` and the files that are not committed yet). Keep the behavior the same. Write no code comments, and change no test file or Markdown file. Decline each `/simplify` fix that removes a log or error handling, or that changes a file outside the branch diff. After its edits, run the gate again.
   - Fix agent after an E2E fail (the prompt has an `<e2e-fail>` block): do not run the simplify step. Fix only that fail. First check the `Expect` text of the failed step against its source. When the code is wrong, fix the code. When the brief is wrong, correct `brief.md` and name the source. When no source decides, ask the user and keep the pane open. Then commit, push, and hand off to a new E2E agent as above, with the full brief.
2. **E2E agent (E2E tab). Off since 2026-11-20: skip this step.** Test only what the brief lists, one step at a time. Never change code. Section 8 ("E2E agent") has the method.
   - First merge the latest `origin/main` into the branch and push (the "Latest main" rule above).
   - Take the "before" shots: do the steps of the brief on the default branch. When `before/` already has them from an earlier E2E round, use them. Then do the steps on the branch (the repo overlay says where the branch runs; use `browser-harness` for a web page or Telegram Web) and take the "after" shots.
   - Each step passes: do the money-path real run when the brief names one (the money path rule of the overlay). Write the result in `report.md`. Release the test env (bot, preview), remove your worktree, and run `dispatch --type review --name <name>-review --on <branch>`.
   - A step fails: stop at that step. Ping the user and hand back to a fix agent (section 8, "A failed step").
   - When `dispatch` succeeds, put your final report on the screen, then run `dispatch-close` as your last command (section 7).
3. **Review agent (Reviews tab).** First merge the latest `origin/main` into the branch and push (the "Latest main" rule above). Read `~/.claude/skills/dispatch/review.md` and follow it on `origin/<default>...<branch>`. Push the fixes to the branch.
   - When review.md step 5 is done and the gate passes, open a draft PR with `gh pr create --draft`. Its body has a *Manual test* section with the steps of `brief.md`. The chain takes no live shots: in place of *Before / After*, write one line that the screens have no shots because the user tests them by hand (E2E is off since 2026-11-20).
   - CI often does not run the tests on a draft PR, so do not wait for them. They run on GitHub when the Manual Test agent marks the PR ready (section 10, step 5).
   - Then hand off (review.md step 5b): remove your worktree and the local branch, run `dispatch --type manual --name <name>-test --on <branch>` with the prompt below, and close your pane. Never set Done, do the team posts, or run `gh pr ready` yourself.
4. **Manual Test agent (Manual Test tab).** Follow section 10: guide the user through the test and wait for the OK. After the OK, mark the PR ready, wait for green CI tests, set Linear Done, do the team posts of the overlay, and close your pane.

Prompt for the next agent:

```
<task>
(the original task, word for word)
</task>

Only <task> is the request. The text below is reference.

<context>
Task type: e2e | review | manual (hand-off chain, section 6 of the dispatch skill). Follow your step there.
Dispatch is done: you are the e2e | review | manual agent in the worktree above. Run `dispatch` only for the next hand-off step of section 6.
Clean up: follow section 7 of the dispatch skill. Close each browser tab that you opened when you are done with it. When your step is done, put your final report on the screen, then run `dispatch-close` as your last command to close your pane.
Repo rules: read ~/.config/dispatch/overlays/<repo>.md. It wins over SKILL.md and review.md. (only when the overlay exists)
(review and manual) A task-notification is the result of your sub-agent: read it and continue at once. Never answer "No response requested."
(manual only) Draft PR: <link>. Follow section 10 of the dispatch skill. After a `--pr` review, add the push rule of the review prompt (section 3).
Branch: <branch>. Shots folder: ~/.local/share/dispatch-e2e/<repo>-<slug>/.
Linear: <issue key> <issue URL> (leave out when no issue is linked). Read it with `linear-api`. The Manual Test agent sets it to Done after the user's OK.
What changed: (one or two lines of facts from the commits)
</context>

Start the work now.
```

For an `e2e` agent, put the brief between `</task>` and `<context>`, and write `Only <task> and <brief> are the request.` in place of `Only <task> is the request.`:

```
<brief>
(the text of brief.md, word for word)
</brief>
```

For a fix agent after an E2E fail (`dispatch --type bug|feature --name <name>-fix --on <branch>`, the type of the original task), use the same form. Write `Task type: bug | feature, fix after an E2E fail (hand-off chain, section 6 of the dispatch skill). Follow the fix agent step there.` and `you are the fix agent`. Put the fail between `</task>` and `<context>`:

```
<e2e-fail>
(the ping text of section 8, "A failed step", word for word)
Brief: <shots folder>/brief.md. Report: <shots folder>/report.md.
</e2e-fail>
```

## 7. Clean up when done (every dispatch agent)

These rules apply to each agent that `dispatch` starts: bug, feature, e2e, review, and monitor. They free RAM, CPU and usage.

Browser tabs:

- Close each browser tab that you opened when you are done with it. This applies to E2E test tabs and to tabs that you only used to read data.
- With `browser-harness`, run `close_tab(<targetId>)` for each tab that you opened, with your own `BU_NAME`.
- Close only the tabs that you opened. Never close a tab of the user or of another agent.
- Close your tabs before you close your pane, also when the task stops early.

Your pane:

- Close your pane when your step is done:
  - fix agent, E2E agent and review agent: right after the `dispatch` of the next step succeeds (review agent: review.md step 5b);
  - Manual Test agent: at review.md step 7, after the user's OK and the team posts of the overlay;
  - monitor agent: when the job ends (the event came, the last scheduled run is done, or the user stops it).
- Before you close: `git status` shows nothing that is not pushed, your worktree is removed, your test env (bot, preview) is released, and your browser tabs are closed.
- Put your final report on the screen. Then run `dispatch-close` as your last command.
- Keep the pane open when the hand-off failed, when you wait for the user, or when the work stopped before it was done (for example, low memory). The user continues those panes later.

## 8. Spec and E2E checks (every UI or UX task)

The user added these rules on 2026-11-18. A client tested a preview with all open PRs and found many problems. The causes were:

1. We did not compare the screens with the spec. The issues only linked to the spec doc, and nobody listed the rows of each screen. The tests checked that the flow works, not that the layout matches the spec.
2. We used the existing code in place of the spec (saved defaults, a default Refresh button), but the spec showed something different.
3. The PRs ran at the same time and did not check each other. Five flows had five PRs, each with its own layout. A shared change missed four screens.
4. The first test with all PRs together was the client's test, so the client found the problems of the merge.
5. We guessed when there was no mockup.
6. We did not test with bad data. Nobody opened the same screen many times, so nobody saw a cache problem.
7. Some PRs had no Linear issue, so two agents built the same feature.
8. We went too fast. The client asked for "one thing at a time".

The rules below stop these causes. A repo overlay can add design rules (design sources in a fixed order, a mockup gate, a token list). Follow them for each UI task.

### One control, one form (a unified design)

The user's rule of 2026-11-19: one control (a button, a row, a title, a label, an icon, a format) has one form on every screen of the app.

- **Look first.** Before a part gets a form, find the same control in the app, and its builder (a shared function or component that makes it).
- **A form in use continues.** When the app already has a form for the control (the word, the icon, the place in the row, the builder), use that exact form. Do not take a different form from a reference app or from a doc image for one screen.
- **A change is a change for every screen.** When the user or the client changes a shared control, the builder and each screen with that control change in one PR, never one screen only.
- **Two forms in the app are a bug.** When the app shows two forms for one control, do not add a third form. Log the two forms in Linear and ask the user which form wins.

### Design sources (the agent never decides the design)

The user's rule of 2026-11-19: "we dont want you to decide the design here". For each part of a screen, use the spec (the issue, the spec doc and its images, the client messages), then the sources of the repo overlay. When no source answers, or the sources disagree: do not guess, and do not select a form. Ask the user, and wait for the answer.

- A part with no source is a question, not a design. For a new part, our own code and an older screen of ours are not a source. For a control that the app already has, the form in use is not a new design: continue with it.
- In `report.md`, write the source next to each line of the spec checklist.

### Fix agent

- **Spec checklist.** Before you write code, read the spec: the Linear issue, the spec doc and its images, and the client messages that the issue links. Write a checklist in `report.md` of the shots folder. Give one block for each screen, and one line for each row of buttons (the labels in order), each text line, and each emoji or icon. Give a block also to each other screen of the same family that shows the same control, also when the issue does not name that screen. A change that the issue asks for on one screen applies to each of those screens, unless the issue says that it is for one screen only.
- **The spec wins over the existing code.** When an existing helper, preset or default gives a different result from the spec (a different number of buttons, an extra Refresh, a different row), follow the spec. Write each such place in `report.md`. This rule is about what a screen has: its rows, its buttons, its values. The word and the icon of a control that other screens share (Back, Close, Refresh, Cancel) follow the rule "One control, one form".
- **No mockup, no guess.** When the task asks for a new layout or new formatting and there is no spec image or example, stop. Do not make up a design. Follow "Design sources" above (and the mockup rules of the overlay), and build only after the answer. Keep the pane open while you wait.
- **One builder for one control.** Before you build a control (an amount row, a settings row, manage rows, a progress bar, a prompt), find where the other flows show the same control. Reuse or extract one builder, and change every screen that uses it. The shared builder comes before the second copy: never copy a control into your flow and change the copy. When the builder is only on an open PR branch and not on `main`, stop and tell the user, because the task belongs on that owner branch (section 1).
- **Open PRs on the same code.** Run `gh pr list --state open` and look at the PRs that touch the same files or the same helper. Write them in `report.md`, so the review agent can check them.

### E2E brief (fix agent)

The user's rule of 2026-11-19: the E2E agent gets a clear brief and tests only that. The fix agent writes the brief, because it knows what changed.

- **Only the change.** List only what this branch changed. Name each screen that the change touches, also each other screen of a shared builder that the change touches. Leave out every other screen.
- **The look.** For each changed screen, write the full screen as text: each text line, then each button row with the labels in order, emoji included. Mark each changed line with `← changed`, and give its source ("Design sources" above): the quote with its link, the spec image path, or the reference shot path.
- **The function.** For each changed button or input, write what a tap or a reply does, and which screen comes next.
- **The steps.** Write the full flow from the first screen of the flow to the change, one action in each step. Each step has an `Expect` text. A step that shows a changed screen has the full look.
- **Money path.** Write `Money path: no`, or the money path of the real run, as the repo overlay defines it.
- A changed line with no source is not ready for E2E. Follow "Design sources" first.

Form (the example is a task "the Orders screen has a Back button"):

```
E2E brief: <issue key> <one-line title>

Issue
- <the requirement, as the issue or the user wrote it> (source: <link or path>)

What changed (only this)
- <screen or path>: <before> -> <after>
- Screens: <each screen that the change touches>
- Money path: no | <chains>, <order states>

Setup
- <what the test needs first: an account, an item, an open order, a setting>

Steps
1. Open the app.
   Expect: the Home screen.
2. Tap `<the Orders button, as the app shows it>`.
   Expect: the Orders screen:
     <text line>
     [ ◀️ ] [ 1/3 ] [ ▶️ ]
     [ ← Back ]          ← changed (source: <link or path>)
3. Tap `← Back`.
   Expect: the Home screen.

Out of scope
- <what looks related, but this branch does not change it>
```

### E2E agent

The user's rule of 2026-11-19, because the broad E2E test "really failed me alot, espically with design". The E2E agent tests only the brief. It does not test other flows, a staging env, more data cases, or other screens that the brief does not list. It never changes code.

- **One step at a time.** Do the action of the step. Take a shot, and save it as `after/<NN>-<screen>.png`. Read the shot with the Read tool. Read the text and the button labels from the page too, so each word and each emoji is exact.
- **Compare with the brief.** Compare each line marked `← changed` with the `Expect` text: word by word, emoji by emoji, row by row, in order. Compare it also with the source image when the brief names one. The other lines of the screen must be the same as in the "before" shot. Each tap must do what the brief says.
- **Pass: continue.** Write `PASS` and the shot path for the step in `report.md`. Then do the next step.
- **Fail: stop.** Each difference is a fail, also a small one (a word, an emoji, a space, the row order). A step with no `Expect` text, or a step that you cannot do, is a fail too. Do not do the next step. Do "A failed step" below.
- **Money paths: a real run.** When the brief names a money path, follow the money path rule of the repo overlay.
- **Report.** In `report.md`, give each step: the action, `PASS` or `FAIL`, the "before" shot and the "after" shot. Put the source image next to the "after" shot of each changed screen.

### A failed step

1. Write the fail in the "Bugs found in E2E" list of `report.md`: the round (1 for the first E2E agent, then 2, 3…), the step, what broke, and the cause (`code` = the fix is wrong, `brief` = the brief is wrong or has a gap, `spec` = the task was not clear, `env` = the test env, the account or the data). Write "none" when each step passed in round 1.
2. Ping the user (the user asked for it on 2026-11-19). Send this text with `claude-tg -t info`, and put the same text on your screen:

   ```
   E2E stopped: <issue key>, step <N> of <M>.
   Step: <the action>
   Expect: <the Expect text> (source: <link or path>)
   Seen: <what the shot shows>
   Shot: <path of the after shot>
   Next: fix agent <name>-fix in the <Bugs | Features> tab.
   ```

   If `claude-tg` fails, say so on your screen and in the `<e2e-fail>` block.
3. Cause `env`, or the third fail of the same step (count its lines in the "Bugs found in E2E" list): do not hand off. Write `Next: waits for you in the E2E tab.`, keep the test env and the pane, and wait for the user. The user set the 3-fail limit on 2026-11-19, so that the fix -> E2E loop cannot run without end.
4. Other causes: release the test env, close your browser tabs, and remove your worktree and the local branch. Run `dispatch --type bug|feature --name <name>-fix --on <branch>` (the type of the original task), with the prompt of section 6 and the ping text in its `<e2e-fail>` block. Then put your final report on the screen and run `dispatch-close` (section 7).

### Process

- Each bug or feature has a Linear issue before an agent starts. One feature has one issue and one agent (see section 1).
- Follow the client's order, one task at a time when the client asks for it (see section 1).

## 9. Shared preview branch and staging (repo overlay)

Some repos have a shared branch with all open work (for example `development` = `main` + every open PR) and a staging env where the client tests. The repo overlay describes them: how the branch is built, who may push it, and what the fix, E2E and Manual Test agents check there. When the overlay has no such section, skip this section.

## 10. Manual Test: the user tests before Done (all repos)

The user's rule, 2026-11-19. It wins over every other step, rule, repo file or memory that sets Done, does a team post, marks a PR ready, or merges.

- No Linear Done, no team post, no `gh pr ready`, and no merge before the user tests the change and says OK. This applies to backend changes too.
- The review agent opens the PR as a draft (`gh pr create --draft`). The team does not see a draft yet, and CI often does not run the tests on it. Then it hands off to the Manual Test tab (review.md step 5b).
- The Manual Test tab holds only agents that guide the user through a test. So the user sees in one tab what is in review, and in another what waits for a test.

Manual Test agent:

- **No code edits (hard rule, the user, 2026-11-20).** The Manual Test agent only helps the user test by hand. It never edits, commits, merges or pushes code on the branch unless the user asks for that edit. This covers a fix, a merge of `origin/main` into the branch, a conflict fix and a red-check fix. When a step below needs a code change, tell the user what and why, and wait for the user's ask. A merge of the PR into the shared preview branch (section 9) after the user's OK is not a branch edit.

1. Run the branch where the user can test it, as the repo overlay says (a test bot, a test site, a preview). Keep it claimed until the end.
2. Read `report.md` of the shots folder and the PR body. Then end your turn with the test message below. Put nothing after it. Keep the pane open.
3. Only a clear OK counts ("ok", "works", 👍). A question or a bug report is not an OK. Answer each question in the same short style.
4. A bug report: tell the user the cause and the fix you propose. Only when the user asks for the fix: fix it, and get the fix reviewed (review.md steps 3 and 4). Test it live, run the gate without tests, and push. Then send a new test message with only what changed, and wait again.
5. The OK: run `gh pr ready <PR>` (skip it when the PR is not a draft). Do the ready steps of the repo overlay (for example a shared preview branch rebuild, section 9). Then run `gh pr checks <PR> --watch` and wait for green tests (the overlay names the test check; with no overlay, every required check). When the test job shows `skipping`, no test ran: run the command again. A red check is a P1: tell the user; when the user asks, fix it on the branch (review.md steps 3 and 4), push, and watch again.
6. Then do review.md step 6 (Linear Done, the time comment, the team posts of the overlay) and step 7 (release the test env, remove the worktree, close the pane).

The test message:

- The user reads fast and does not like long text. Use simple English (STE), short lines, and no filler. Start each line with the fact or the action.
- Name each button and command exactly as the app shows it, emoji included.
- Give the steps to reach the change also for a backend fix: the screen, the message, the fill or the log line where the user sees the result.
- Use this form. Leave out each line that does not apply.

```
🧪 Please start testing this: <issue key>, <one-line summary of all the changes>

**Issue**
- <what was wrong, as the user saw it>

**Fix**
- <one line for each change>
- UI: <screen>: <before> → <after>. Why: <reason>.   (or: UI: no change.)

**How to test** on <test bot or test site URL>
1. <one action: open, tap, send, type>
2. <one action>
✅ Expect: <what you see when it works>
⚠️ Real money: <wallet, token, amount>   (only when a step trades)

Shots: <shots folder> · Draft PR: <link>
Reply `ok` when it works, or tell me what is wrong.
```
