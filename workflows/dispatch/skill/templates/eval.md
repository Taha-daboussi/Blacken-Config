---
id: <id>
repo: <repo>
kind: code | ui
step: review | expected | plan | ui-judge | check | none (none: no replay; the miss stays kind 3 or 4, not proved)
role: <finder A | finder B | finder C | finder D | final check> (step review only)
scope: every repo | one repo
commit: <full sha of the code before the fix>
fixed: <full sha of the fix commit> (step check: the check must pass here)
base: <origin/main sha at that time> (step review)
check: <command that exits non-zero when it finds the problem> (step check)
patch: assets/<id>/check.patch (step check, when the check is not in the repo yet)
pr: <n>
---

# Eval <id>: <one-line summary>

## Input

- step review: the range `<base>...<commit>`.
- step expected or plan: `assets/<id>/task.md`.
- step ui-judge: the expected step text, and `assets/<id>/` shot, DOM text and OCR text.
- step check: the command above, at `commit` and at `fixed`.

## Must report

- review: a finding at `<file:line>` (or in `<function>`) that says: <the problem in one line>.
- expected or plan: a line that names <the screen, the case, or the step>.
- ui-judge: `FAIL` on the line `<expected line>`, because the shot shows `<seen>`.
- check: exit non-zero at `commit`, exit 0 at `fixed`.

## Source

- Miss: `misses/<id>.md`

## Results
