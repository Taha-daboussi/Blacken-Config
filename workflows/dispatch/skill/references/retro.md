# Learn from misses

A **miss** is a problem that a person found after a pipeline step said "done" for that part: a human review comment after our review was clean, a UI note after our e2e passed, a bug that the user found in the manual test, or an e2e fail because `expected.md` was wrong. A fix of the miss is not enough. Find why the step missed it, change the system so that the step catches that class next time, and prove the change on the old code.

## Contents

- Automatic triggers
- The pane
- Retro agent (sub-agent `dispatch-retro`)
- The mitigation ladder
- Eval cases and `dispatch-eval`
- The ledger and the retro summary

## Automatic triggers

- A bug that the user reports in the manual test (step 9): a retro after the fix, before the pane closes.
- An e2e fail with the cause `expected`: a retro at step 10.
- A feedback task (`references/feedback.md`): a retro for each valid item.
- A note that the user pastes about a merged or ready change: a feedback task, then the retro.
- A monitor for new human comments: `dispatch --type monitor --name pr-watch` with the task "every 30 minutes, check our open PRs (`gh pr list --author @me --state open`) for new comments by people since the last check, read-only; for each PR with new comments, run `dispatch --type feedback --pr <n>`". The user starts it one time for each space.

## The pane

`dispatch-step 10 retro` (or `dispatch-step 1 retro` in a retro task)

1. Make the folders: `~/.config/dispatch/<repo>/misses/` and `~/.config/dispatch/<repo>/evals/`. The id is `<YYYY-MM-DD>-<pr or key>-<n>`.
2. Start one `dispatch-retro` for each miss, at the same time. Give it the miss (the quote, the link, the shot), the task folder of the original task (`~/.local/share/dispatch/<repo>-<slug>/`) when it exists, BLACKFILE.md, and the two output paths.
3. For each result, run the proof: `dispatch-eval <repo> <id>` (below). When the changed step does not catch the miss, send that result back to the same retro agent for the next kind of mitigation. Stop after kind 3; kind 4 needs no proof.
4. Show the user each mitigation in 3 lines (the step, the cause, the change) and ask yes or no for each one (`--wait`). The user's rule: never add or change a rule without asking.
5. On yes:
   - a BLACKFILE.md line: add it to the section that the retro names, in the chunk that the index table lists for that section (or the `custom/` file that the section points to), with its source. Add it to the index only when it is an "Always" rule, and keep the index under 3,000 characters;
   - a change to the skill, an agent, or a script for every repo: commit it on a branch of Blacken-Config (`git worktree add -b fix/dispatch-<slug> ../Blacken-Config-<slug> origin/main`), and tell the user the branch;
   - a check for one repo (a lint rule, a CI step, a test): start `dispatch --type feature` for it, with the miss file as the spec.
6. Add one line to `~/.config/dispatch/<repo>/misses.md` for each miss (below), also on a no.

## Retro agent (sub-agent `dispatch-retro`)

Write `misses/<id>.md` in the form of `~/.claude/skills/dispatch/templates/miss.md`.

1. **What was wrong.** The quote word for word, the `file:line` or the shot, and the commit where our step said done (the PR head when the comment came, or the commit of the e2e or review report).
2. **Which step had to catch it.** Read the reports of the original task: `expected.md` (did it name this?), `review/*.md` (which finder had this in its focus? did one drop it as a candidate?), `judge/*.json` and `shots/` (did the judge see it?), `e2e-backend.md`, `report.md`. Pick the earliest step that could have caught it.
3. **Why it missed.** Pick one cause, with the evidence:
   - `input missing`: the step did not get what it needed (the spec, the newer main, the callers, the real data, the other screens of the family).
   - `rule missing`: the step had no rule for it (a team convention, a design token, a form in use, a hot spot).
   - `method wrong`: the step had the input and the rule, but its method did not find it (the reviewer read only the diff; the judge did not compare the emoji; the runner tested another screen).
   - `step did not run`: skipped, timed out, no env.
   - `scope wrong`: outside the task, or the spec was not clear.
4. **The mitigation.** The strongest kind on the ladder below that fits this class of problem, not only this one case. Write the exact change: the file, the new line or the diff.
5. **The eval case.** Write `evals/<id>.md` in the form of `templates/eval.md`: the commit before the fix, the step, and what the step must report.

## The mitigation ladder

Use the first kind that fits. Say in the miss file why a stronger kind does not fit.

1. **A check that runs every time.** A lint rule, a script check (for example a catalog check for every locale, or a new pattern in `dispatch-ui-diff`), a hook, a CI step, or a test where BLACKFILE.md permits test edits. It needs no model to remember anything.
2. **A pipeline change.** A new hunt for a finder in `references/review.md`, a new line in `templates/expected.md` or in the spec agent, a new judge check in `references/e2e-ui.md`, or a new input for a step (for example the callers of the helpers that `main` changed).
3. **A BLACKFILE.md rule.** A "Review rules" line (finder C quotes it), a "Hot spots" line (finder D reads it), a "Design sources" line or a token.
4. **A note only.** Only when the miss is a one-time product choice or outside any step.

## Eval cases and `dispatch-eval`

`dispatch-eval <repo> <id>` prints the commands for one eval case; `dispatch-eval <repo> --all` for every case. It makes a detached worktree at the case commit, then:

- step `review`: run one `dispatch-reviewer` with the role that the mitigation changed (or all finders), on the range of the case, with the BLACKFILE.md of today;
- step `ui-judge`: run `dispatch-ui-diff` and one `dispatch-ui-judge` on the saved shot and text;
- step `expected`: run `dispatch-spec` on the saved task and check that `expected.md` has the line.

The case passes when the report has the item of "Must report" (same place, same problem). Write the result in the miss file. Remove the worktree after the run.

Run `dispatch-eval <repo> --all` after each change to the skill, an agent, or BLACKFILE.md, so a change does not lose an old catch. It costs one sub-agent for each case: run it when the change touches a step, not after a typo fix.

## The ledger and the retro summary

`~/.config/dispatch/<repo>/misses.md`, one line for each miss, newest last:

```
2026-11-21 | PR #107 | code | finder A | input missing | 2 pipeline: callers of main-changed helpers | eval caught | yes
```

The fields are: the date, the PR or key, the kind, the step, the cause, the mitigation kind and change, the eval result, and the user's answer.

`dispatch --type retro` (no PR) starts a summary task: count the misses by step and by cause for the last 30 days, name the step that misses most and the cause that repeats, and propose one change for the top cause. It changes nothing without the user's yes.
