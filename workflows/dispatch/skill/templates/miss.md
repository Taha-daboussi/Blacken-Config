# Miss <id>: <one-line summary>

- Date: <YYYY-MM-DD>. Repo: <repo>. PR: #<n>. Issue: <key>.
- Kind: code | UI
- Found by: <reviewer, the user in the manual test, the client, the e2e brief check>
- Quote: "<the comment or the note, word for word>" (<link>)
- Where: <file:line, or the shot path>
- Our "done" commit: <sha> (the step that said done: <step>)

## Which step had to catch it

<plan | expected | build | review finder A | B | C | D | team tool | backend e2e | UI runner | UI judge>

## Why it missed

Cause: <input missing | rule missing | method wrong | step did not run | scope wrong>

<two or three sentences of evidence: what the step got, what it did, and why that was not enough>

## Mitigation

Kind: <1 check that runs every time | 2 pipeline change | 3 BLACKFILE rule | 4 note only>

<the exact change: the file, the new line or the diff, and where it lives>

Why not a stronger kind: <one line, when kind is 2, 3 or 4>

## Proof

- Eval case: `evals/<id>.md`
- Run: `dispatch-eval <repo> <id>` on <sha before the fix>
- Result: caught | not caught (then the next kind of mitigation)

## Approval

- User: yes | no, <date>
