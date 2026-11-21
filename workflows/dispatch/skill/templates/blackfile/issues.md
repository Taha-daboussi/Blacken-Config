# issues: <repo>

A chunk of `~/.config/dispatch/<name>/BLACKFILE.md`. Read it before an issue write, a status change, a comment, a branch name, a new task.

## Names

- Branch: `fix/<key>-<slug>` and `feat/<key>-<slug>` (default), or the repo rule (for example `<author>/<issue>`).
- Pane name: the issue key in lower case.

## Issue tracker

- Tool and workspace: for example `linear-api <workspace>`, team `<KEY>`.
- States: work starts -> `In Progress`; draft PR opens -> `<state or none>`; done -> `Done` (after the user's OK, or after the merge).
- Comment at done: what it holds (for example the `dispatch-stats` table).
- Tool traps: for example "the API key cannot write comments, use the MCP".

## Boards

- Board, lists, and when a card is added, linked, and moved. `none` when there is no board.
