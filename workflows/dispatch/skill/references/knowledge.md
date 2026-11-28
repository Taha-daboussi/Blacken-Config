# Knowledge: save what the task learned

The pane runs this at step 10, after the learn step and before it closes. Skip it when `dispatch-knowledge` in the worktree prints nothing (the repo has no library), or when the task learned no business fact.

The library holds business meaning: product rules, user needs, team decisions, known issues, and what a code change means for the business. Code facts stay in git and are not saved.

## 1. Collect

Write `knowledge.md` in the task folder from `<skill>/templates/knowledge.md`. Take the facts from:
- The "Decisions" of `handoff.md`: each answer of the user and its reason.
- The "Unknown" lines of the business brief in `plan.md` that the user answered.
- A business fact that a doer found and the library does not have (from the issue, the PR threads, the logs, the code), written as its business meaning.
- A known issue or a risk that the task found and did not fix.

Max 10 facts. One fact per block, with its source. Nothing found: write "none" and stop here.

## 2. Check

Start `dispatch-knowledge-critic` with the task folder and the library path. It writes `knowledge-check.md`. Never give it `handoff.md` or the plan story: it judges each fact fresh.

## 3. Ask the user

Run `dispatch-step 10 knowledge --wait "facts for the library"`. Show each `keep` and `fix` fact in this form, max 4 in one `AskUserQuestion` call:
- The fact, in one simple sentence.
- Why it matters for the business, in one sentence.
- Source, and where it goes in the library.
- The critic: what it changed (`fix`), or "all 6 checks pass".

Options: "Save", "Do not save", and "Change it" (the user gives the new text). Show the `drop` facts in one list after the questions, each with its reason, and ask one time if the user wants to keep one of them.

## 4. Save

Only the facts with the user's yes. In the library folder:
1. `git pull --ff-only`. A local change or a failed pull: stop and tell the user. Do not save.
2. Write each fact in the target file and the form of `knowledge-check.md`, by the rules of `HOW-TO-UPDATE.md` of the library (front matter `updated:` and `sources:`, decision table rows, `Guess:`, `Conflict:`, `INDEX.md` for a new file).
3. Scan the changed files for secrets, phones, and emails with `rg`.
4. One conventional commit, for example `docs(decisions): add 2 facts from <issue key>`, with no AI attribution. `git push`. A failed push: tell the user and keep the commit.
5. Log the saved facts and the commit in `handoff.md` "Log" and in `report.md`.
