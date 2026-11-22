# Miss <id>: <one-line summary>

- Date: <YYYY-MM-DD>. Repo: <repo>. PR: #<n>. Issue: <key>.
- Kind: code | UI
- Found by: <reviewer, the user in the manual test, the client, the e2e brief check>
- Quote: "<the comment or the note, word for word>" (<link>)
- Where: <file:line, or the shot path>
- Area: <paths or packages, for example internal/orders, templates/>
- Our "done" commit: <sha> (the step that said done: <step>)

## Which step had to catch it

<plan | expected | build | review finder A | B | C | D | team tool | backend e2e | UI runner | UI judge>

## Why it missed

Cause: <input missing | rule missing | method wrong | step did not run | scope wrong>

<two or three sentences of evidence: what the step got, what it did, and why that was not enough>

## Mitigation

Kind: <1 check that runs every time | 2 pipeline change | 3 BLACKFILE rule | 4 note only>
Scope: <every repo | one repo>

<the exact change: the file, the section, and the new line or the diff. For scope "every repo", no fact of one repo.>

Why not a stronger kind: <one line, when kind is 2, 3 or 4>

## Proof

- Eval case: `evals/<id>.md` (replayable: yes | no, and why)
- Before (live files): caught | missed
- After (draft): <n>/2 caught (model step) | caught, no false alarm (check)
- Old cases of the same step: <caught>/<total>

## Approval

- User: yes | no, <date>. Draft: <branch>, applied | dropped.
