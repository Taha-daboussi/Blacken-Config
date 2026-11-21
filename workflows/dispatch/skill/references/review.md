# Step 6: Review

The pane runs the review rounds of `~/.claude/REVIEW.md` with `dispatch-reviewer` sub-agents. `REVIEW.md` is the policy: what a finding is, the levels, the rounds, the stop rule. This file says who does each step, with which model, and in which order. BLACKFILE.md wins over this file ("Team review tool", "Review rules", "Hot spots", "Models").

## Contents

- Rules for the whole review
- Step 0: Merge the newest main
- Step 1: Find
- Step 2: Merge and disprove
- Step 3: Fix
- Step 4: Re-review
- Step 5: Final check
- Review task (another person's PR)

## Rules for the whole review

- **Small context.** Do not read the full diff yourself. The finders read it. Read long command output with `tail` or `rg`.
- **Paths, not summaries.** Give each sub-agent: its role, the worktree, the range, the task folder, the report path, and the paths of BLACKFILE.md, `expected.md`, `plan.md`, and the earlier reports.
- **Reports in files.** Each sub-agent writes `review/<round>-<role>.md` and returns the path and a one-line tally.
- **Tests.** A finder may run the scoped test command of BLACKFILE.md "Tests" to confirm a claim. Only one test run at a time on the machine: tell the finders "ask the pane before a test run" when BLACKFILE.md says the machine is small.
- **P0 and P1 are always fixed in this task.** Never move one to "Follow-ups", above all on a money path.
- **Fix policy.** BLACKFILE.md "Team review tool", line "Review policy", decides which P2 and P3 to fix (for example "only P0, P1 and UI problems"). With no line: fix each valid finding of the report, P0 to P3, in the same round (`REVIEW.md` section 5).

## Step 0: Merge the newest main

Reason: about one boss finding in five came from code on `main` that the branch did not have yet.

1. `git fetch origin && git merge origin/<default>`. Merge, never rebase, because the branch is pushed. Fix each conflict on the branch.
2. Run the gate and the scoped tests of BLACKFILE.md. A red result goes to `dispatch-builder` as a fix round.
3. Push. Range: `origin/<default>...HEAD`. Note the head SHA.
4. List what `main` changed since the branch point (`git diff <merge-base> origin/<default>`) in the files and packages that the branch changes or calls: each changed or new function, and each new check that `main` added to a function (a minimum, a limit, a role check, a state check). For each one, name the branch code that calls it, and the branch code that is a second path for the same action and does not call it (an Edit, Retry, Resume or Import next to a Create or Buy that `main` changed). Write the list to `review/main-changes.md`. Finder A reads it. (Retro 2026-11-21, PR #107: the old list held only the called functions, so it was empty, and the new minimum check on Create never reached the branch's Edit.)

## Step 1: Find

**Depth gate.** Count the changed lines without tests and generated files (`git diff --stat`), and check the risk areas: money, auth and roles, account boundaries, jobs and schedules, migrations, CI and build files, secrets, message sending.

| Diff | Finders |
|---|---|
| Under 150 lines and no risk area | A and C |
| A risk area, or 150 lines or more | A, B, C and D |

Start the finders at the same time (one message), `subagent_type: "dispatch-reviewer"`, role `finder <letter>`:

| Finder | Focus |
|---|---|
| A | Correctness: logic, the real edge cases of `REVIEW.md` section 1, callers, old rows and old clients, and each item of `review/main-changes.md`: the branch callers, and the branch paths that must also call it. |
| B | Security and boundaries: auth, roles, tenants, secrets in logs and errors, external input, CI jobs that run PR code with base-branch rights, messages or payments to the wrong target. |
| C | Rules: each line of BLACKFILE.md "Review rules" and the repo rules (`CLAUDE.md`, `AGENTS.md`). It reports a rule only when it can quote it. Also: the PR scope against the diff, `expected.md` against the diff (each acceptance line has code), i18n or copy catalogs, and for a UI change the rules of `references/ui-rules.md`. |
| D | State and lifecycle: lock order of every writer to the same tables, pause, delete, move or "done" with work in flight, old and new state live at the same time, stale events from an old source, the same request or job twice, edits that skip create validation, slow I/O in a hot synchronous path, and each line of BLACKFILE.md "Hot spots". |

Tell each finder: read `REVIEW.md` and use its method (`code-review-and-quality` is a good guide when it is installed); read-only; report a P0 or P1 outside its focus too; write the report in the format of `REVIEW.md` section 8, with the dropped candidates.

## Step 2: Merge and disprove

1. Read the reports. Merge the findings with the same root cause. Set each level by `REVIEW.md` section 3.
2. For each P0 or P1, start one `dispatch-reviewer` with role `disprove` and `model: "sonnet"`, all at the same time. Give it the claim and the `file:line`, not the reasoning. It returns "confirmed" or "disproved" with the evidence.
3. Keep the confirmed P0 and P1, and the P2 and P3 that the fix policy fixes.

No findings: go to step 5.

## Step 3: Fix

1. Send the findings to `dispatch-builder` as a fix round, with the report paths. For many findings in separate files, start one builder for each group of files, at the same time, and tell each one its files only. A group with only UI-part findings (`references/pipeline.md`, "UI part and logic part") gets `model: "sonnet"`; a group with any logic-part finding gets the default (Opus).
2. The builder confirms each finding first, and declines a finding that is not valid with the reason in the commit message.
3. Run the gate and the scoped tests one time. Push.

## Step 4: Re-review

Only a fixed P0 or P1 starts a re-review (`REVIEW.md` section 4).

Start one `dispatch-reviewer`, role `re-review`, `model: "sonnet"` (`"opus"` when a fix touches a money path). Give it the range `<head before the fixes>..HEAD` and the earlier reports. It gives each earlier finding a state, reviews the fix commits with the callers of each changed function, and reports new P0 and P1 only.

A new P0 or P1: do steps 2 to 4 again. After 3 rounds with a P0 or P1, or by the other stop rules of `REVIEW.md` section 4, stop: `dispatch-step 6 review --wait "review not converged"`, and give the open items and the trade-off to the user.

## Step 5: Final check

One time for each task, in a fresh context, on the full range `origin/<default>...HEAD`.

- **BLACKFILE.md names a team review tool** (for example `.claude/skills/merge-blockers`): start one `dispatch-reviewer` with role `final check, team tool`. Tell it to read the tool's `SKILL.md` from the repo at `origin/<default>` and follow it as a review of this branch against `origin/<default>`, read-only, with the scoped tests of BLACKFILE.md in place of a full test run. This is the same check that the team runs on the PR.
- **No team tool:** start one `dispatch-reviewer` with role `final check`. Give it the range, `expected.md`, and the scope, but not the earlier findings.

Remove each finding that matches a closed item. A new P0 or P1, or a team-tool "Blocker": steps 2 to 4 with the re-review rules. A team-tool "Must happen at deploy time" or "Needs sign-off" item goes into the PR body.

Write a "Review findings" list in `report.md`: one line for each finding, with its level, its state, and its finder. Write "none" when there was none.

## Review task (another person's PR)

`dispatch --type review --pr <n>` starts a pane for a review only. Do intake (step 1 of `references/pipeline.md`, with the PR as the task), then steps 0 to 5 above.

- Push rule: when the worktree line shows the same login for the PR author and for you (gh), push the fixes to the PR branch. For another author: commit the fixes locally, show them, and ask the user before the push. For a PR from a fork, or from an author that the user does not trust: no tests, no installs, no runs of its code.
- At the end, show the report of `REVIEW.md` section 8. Post nothing on GitHub unless the user asks.
