---
id: <id>
repo: <repo>
kind: code | ui
step: review | ui-judge | expected | backend-e2e
commit: <full sha of the code before the fix>
base: <origin/main sha at that time, for a review step>
pr: <n>
---

# Eval <id>: <one-line summary>

## Input

- code, step review: the range `<base>...<commit>`.
- ui, step ui-judge: the expected step text, the shot `<path>`, the DOM text `<path>`, and the OCR text `<path>`.

## Must report

- code: a finding at `<file:line>` (or in `<function>`) that says: <the problem in one line>.
- ui: `FAIL` on the line `<expected line>`, because the shot shows `<seen>`.

## Source

- Miss: `misses/<id>.md`
