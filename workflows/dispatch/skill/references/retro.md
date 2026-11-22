# Learn from misses

A **miss** is a problem that a person found after a pipeline step said "done" for that part: a human review comment after our review was clean, a UI note after our e2e passed, a bug that the user found in the manual test, or an e2e fail because `expected.md` was wrong. A fix of the miss is not enough. Find why the step missed it, change the system so that the step catches that class next time, and prove the change on the old code before the user decides.

The order is fixed: **analyse -> reproduce -> draft -> prove -> no regressions -> ask -> apply or drop -> ledger.** Nothing live changes before the user's yes. A draft lives on a branch; the live skill, agents and BLACKFILE stay as they are.

## Contents

- Automatic triggers
- The pane
- Retro agent (sub-agent `dispatch-retro`)
- The mitigation ladder
- Scope: every repo or one repo
- Eval cases and `dispatch-eval`
- The ledger and the retro summary

## Automatic triggers

- A bug that the user reports in the manual test (step 9): a retro after the fix, before the pane closes.
- An e2e fail with the cause `expected`: a retro at step 10.
- A feedback task (`references/feedback.md`): a retro for each valid item.
- A note that the user pastes about a merged or ready change: a feedback task, then the retro.
- A monitor for new human comments: `dispatch --type monitor --name pr-watch` with the task "every 30 minutes, check our open PRs (`gh pr list --author @me --state open`) for new comments by people since the last check, read-only; for each PR with new comments, run `dispatch --type feedback --pr <n>`". The user starts it one time for each space.

## The pane

`dispatch-step 10 retro` (or `dispatch-step 1 retro` in a retro task). `<cfg>` is the folder of the index (`dispatch-context --path`, without `/BLACKFILE.md`); `<repo>` is its name.

1. **Folders and id.** Make `<cfg>/misses/` and `<cfg>/evals/assets/`. The id is `<YYYY-MM-DD>-<pr or key>-<n>`.
2. **Analyse.** Start one `dispatch-retro` for each miss, at the same time. Give it: the miss (the quote, the link, the shot), the task folder of the original task when it exists, the index path, the id, and the output paths `<cfg>/misses/<id>.md`, `<cfg>/evals/<id>.md` and `<cfg>/evals/assets/<id>/`. It writes the analysis, the mitigation as an exact change, and the eval case. It changes no live file.
3. **Reproduce (before).** Run `dispatch-eval <repo> <id>` with the live files, one time, and do the job (below). The step must miss the item. The cases, their assets and the main checkout always come from the live config, also when a later run points `--config` at a draft.
   - It catches the item today: the miss does not reproduce (an older mitigation already covers it, or the first miss was chance). Record `before caught`, add no mitigation, write the ledger line with `already caught`, and tell the user in one line.
   - The job says `replayable: false` (step `none`): the step has no replay. Go on; the proof in step 5 must then be a step `check` case, or the mitigation stays kind 3 or 4 with "not proved" in the miss file.
4. **Draft.** Put the mitigation of the miss file on a draft branch:
   - a change to the skill, an agent or a script (scope `every repo`): `dispatch-draft skill <id>`. Edit the files in its `worktree` and commit them there.
   - a BLACKFILE line (scope `one repo`): `dispatch-draft blackfile <repo> <id>`. Edit `<config_dir>/<repo>/<chunk>` in its worktree. It refuses when the live chunks of the repo have changes that are not committed: show them to the user, and commit them after the user's yes, then run it again.
   - a check in the product repo (a lint rule, a CI step, a test where BLACKFILE.md permits it): no draft branch. The retro saves it as `evals/assets/<id>/check.patch` with the command in the case (`patch:` and `check:`), and the eval applies it in a detached worktree.
5. **Prove (after).** Run `dispatch-eval <repo> <id>` with the draft: `--skill <skill_dir> --agents <agents_dir>` for a skill draft, `--config <config_dir>` for a BLACKFILE draft. Do the job.
   - A model step (review, expected, plan, ui-judge) runs **two times**. It counts as caught only when both runs report the item. One run can catch by chance.
   - A step `check` runs one time: it must fail at the case commit and pass at the fix commit (`false_alarm: false`).
   - Not caught: send the result back to the same retro agent with `SendMessage` for the next kind on the ladder. Stop after kind 3; kind 4 needs no proof.
6. **No regressions.** Run the old cases of the same step with the draft: `dispatch-eval <repo> --all --step <step> <draft flags>` for scope `one repo`, and `dispatch-eval --all-repos --step <step> --skill ... --agents ...` for scope `every repo`. Each old case that was caught must still be caught (one run each). A lost catch: back to the retro agent; the draft must keep it.
7. **Ask.** Show the user each mitigation in 4 lines: the step and the cause, the change (file and line), the scope, and the proof (`before: missed, after: 2/2 caught, old cases: 5/5`). Ask yes or no for each one (`--wait`). The user's rule: never add or change a rule without asking.
8. **Apply or drop.**
   - Yes, skill or BLACKFILE draft: `dispatch-draft apply <id>`. A BLACKFILE draft merges into the private config repo. A skill draft stays on its branch: tell the user the branch; the user merges it and runs `install.sh`.
   - Yes, product-repo check: start `dispatch --type feature` for it, with the miss file and `check.patch` as the spec.
   - No: `dispatch-draft drop <id>`.
   - `apply` refuses when the live config has changes that are not committed in the files of the draft, or when the merge fails. The draft branch stays. Show the user the files, and run `apply` again after the user commits them. Never `drop` an approved draft.
   - Record each eval result in the case: `dispatch-eval <repo> --record <id> before|after|regression caught|missed "<note>"`.
9. **Ledger and clean up.** Add one line to `<cfg>/misses.md` for each miss (below), also on a no and on `already caught`. Commit the learn files in the config repo (`git -C <config root> add <repo>/misses.md <repo>/misses <repo>/evals && git -C <config root> commit -m "retro <id>"`). Remove every eval worktree of this retro: `dispatch-eval <repo> --cleanup --all`, and `dispatch-eval --all-repos --cleanup` after an `--all-repos` run. Do this also on the `already caught` path.

## Retro agent (sub-agent `dispatch-retro`)

Write `misses/<id>.md` in the form of `templates/miss.md`, and `evals/<id>.md` in the form of `templates/eval.md`.

1. **What was wrong.** The quote word for word, the `file:line` or the shot, and the commit where our step said done (the PR head when the comment came, or the commit of the e2e or review report).
2. **Which step had to catch it.** Read the reports of the original task: `expected.md` (did it name this?), `review/*.md` (which finder had this in its focus? did one drop it as a candidate?), `judge/*.json` and `shots/` (did the judge see it?), `e2e-backend.md`, `report.md`. Pick the earliest step that could have caught it.
3. **Why it missed.** Pick one cause, with the evidence:
   - `input missing`: the step did not get what it needed (the spec, the newer main, the callers, the real data, the other screens of the family, its BLACKFILE chunk).
   - `rule missing`: the step had no rule for it (a team convention, a design token, a form in use, a hot spot).
   - `method wrong`: the step had the input and the rule, but its method did not find it (the reviewer read only the diff; the judge did not compare the emoji; the runner tested another screen).
   - `step did not run`: skipped, timed out, no env.
   - `scope wrong`: outside the task, or the spec was not clear.
4. **The mitigation.** The strongest kind on the ladder that fits this class of problem, not only this one case. Write the exact change: the file, the section, and the new line or the diff. Write the scope (below). Do not edit any live file.
5. **The area.** The paths or packages of the miss (for example `internal/dca`, `templates/`). The ledger line gets them, so later tasks in that area find the miss.
6. **The eval case.** Always write `evals/<id>.md`. The commit before the fix, the fix commit when it exists, the step, the role, and what the step must report. A step `check` case needs `fixed:`, else its result is "not proved". Copy the inputs that a replay needs into `evals/assets/<id>/` (the saved `task.md` for step `expected` or `plan`; the shot, DOM and OCR text for step `ui-judge`; `check.patch` for step `check`). A step with no replay (build, backend e2e, UI runner, manual test): write a step `check` case when a check can catch it; else write the case with `step: none` and say "not replayable" in the miss file.

## The mitigation ladder

Use the first kind that fits. Say in the miss file why a stronger kind does not fit.

1. **A check that runs every time.** A lint rule, a script check (for example a catalog check for every locale, or a new pattern in `dispatch-ui-diff` or `dispatch-pr-overlap`), a hook, a CI step, or a test where BLACKFILE.md permits test edits. It needs no model to remember anything, and its proof is exact (step `check`).
2. **A pipeline change.** A new hunt for a finder in `references/review.md`, a new line in `templates/expected.md` or in a role file, a new judge check in `references/e2e-ui.md`, or a new input for a step (for example the callers of the helpers that `main` changed).
3. **A BLACKFILE rule.** A "Review rules" line (finder C quotes it), a "Hot spots" line (finder D reads it), a "Design sources" line or a token, in the chunk that the index lists for that section (or the `custom/` file that the section points to), with its source. An "Always" line in the index only when every session of the repo must see it; keep the index under 3,000 characters.
4. **A note only.** Only when the miss is a one-time product choice or outside any step.

## Scope: every repo or one repo

- `every repo`: the class can happen in any repo (a method gap of a finder, a missing input of a step, a script pattern). The change goes into the skill, an agent or a script (kinds 1 and 2). Its regression run uses the cases of every repo.
- `one repo`: the class depends on this repo (its conventions, its hot spots, its design tokens, a lint rule in its code). The change goes into its BLACKFILE chunk or its code (kinds 1 and 3). Its regression run uses the cases of this repo.
- Never put a fact of one repo (a name, a path, a tool, a money rule) into the skill. When a class is general but the example is from one repo, write the general rule in the skill and the example in the miss file.

## Eval cases and `dispatch-eval`

`dispatch-eval <repo> <id>` (or `--all`, or `--all-repos`) makes a detached worktree at each case commit (a review case also merges its `base`, like review step 0) and prints one job for each case as a JSON line. `--skill`, `--agents` and `--config` point the job at a draft. `--step` keeps only the cases of one step.

Do each job:

- step `review`: start one `dispatch-reviewer` with the role of the case (or all finders when it has none), in the job `worktree`, on the job `range`.
- step `expected`: start `dispatch-spec` on a fresh folder with a copy of `assets/task.md`; check that `expected.md` has the line.
- step `plan`: start `dispatch-planner` and then `dispatch-critic` on a fresh folder with a copy of `assets/task.md`; check that `plan.md` or `critic.md` names the item.
- step `ui-judge`: run `dispatch-ui-diff` and one `dispatch-ui-judge` on the saved shot and text in `assets/`.
- step `check`: the script runs it and prints `result` (`caught`, `false_alarm`). No sub-agent.

When the job has a `skill_dir` other than `~/.claude/skills/dispatch`, or an `agents_dir`, put these lines first in the sub-agent prompt: "Skill folder: `<skill_dir>`: read each `~/.claude/skills/dispatch/...` path from there. Role file: `<agents_dir>/<subagent_type>.md`: follow it in place of your built-in instructions." Always give the job `blackfile` path as the index.

The case is caught when the report has the item of "Must report" (same place, same problem). Each sub-agent of an eval writes into a fresh folder in your scratchpad, never into a live task folder.

Run the cases of a step after each change to that step, also outside the learn loop (a skill edit, a BLACKFILE edit): `dispatch-eval --all-repos --step <step>`. It costs one sub-agent for each case: run it when the change touches a step, not after a typo fix.

## The ledger and the retro summary

`<cfg>/misses.md`, one line for each miss, newest last:

```
2026-01-15 | PR #12 | code | finder A | input missing | internal/orders | every repo | 2 pipeline: callers of main-changed helpers | before missed, after 2/2, old 4/4 | yes
```

The fields are: the date, the PR or key, the kind, the step, the cause, the area, the scope, the mitigation kind and change, the proof, and the user's answer (`yes`, `no`, `already caught`).

At intake, the pane reads the lines whose area matches the paths of the task (`rg -n '<path>' <cfg>/misses.md`) and the last 5 lines.

`dispatch --type retro` (no PR) starts a summary task: count the misses by step, cause and area for the last 30 days, name the step that misses most and the cause that repeats, run `dispatch-eval <repo> --all` and list each case that is now missed, and propose one change for the top cause. It changes nothing without the user's yes.
