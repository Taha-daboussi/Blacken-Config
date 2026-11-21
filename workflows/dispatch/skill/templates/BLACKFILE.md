# BLACKFILE: <repo>

The project facts for the `dispatch` skill. Path: `~/.config/dispatch/<repo>/BLACKFILE.md`, where `<repo>` is the folder name of the main checkout. Keep it private: it can hold client names, channel ids, hosts, and board ids. It wins over the skill files where they differ.

Write only facts that an agent cannot find in the code. Leave a section out when it does not apply. Write `none` when the answer is "no" (for example `Tests: none`), so `dispatch init` does not ask again.

## Project

- One line: what the product does, and who uses it.
- Main checkout: `<path>`. Default branch: `main`.

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

## Gate (no tests)

- Command: for example `timeout 900 go build ./... && go vet ./...`.
- Lint rule: for example "only new lint errors count; compare with clean main".

## Tests

- Scoped local command: the tests of the changed packages and of the packages that import them, or `none`.
- CI check: the name of the check that must be green, or `none`.
- CI trigger: for example "post `/test` on the PR", "runs on ready", or `none`.

## File rules

- Test edits: `allowed` or `ask first` or `never`.
- Markdown edits: `allowed` or `ask first` or `never`.
- Glossary and ADRs in the repo (`GLOSSARY.md`, `docs/adr/`): `allowed` or `ask first` or `never`.

## Where the branch runs

- Backend e2e: the test env and how to start it (a test bot, a test server, a local stack), how to claim it, and how to release it.
- UI e2e: the URL or the bot, the login, and the browser tool (`browser-harness` with an own `BU_NAME`).
- Manual test: where the user tests (the same env, or another).
- E2E time cap: `20` minutes.

## Money path

- What counts as a money path, and how to run it (for example "a real run on mainnet, so the order fills").
- Limits: the wallet, the token, the most money for one test.

## Design sources (UI tasks)

- The sources in order (client or boss instructions, a token list, reference apps), and where to ask when no source answers.
- Tools: for example a mockup tool and a token check.

## Team review tool

- The repo's own review skill or command that the team runs on PRs (for example `.claude/skills/merge-blockers`). The review step runs it as the final check. `none` when there is none.
- Review policy: for example "fix only P0, P1 and UI problems" or "P2 blocks".

## Review rules

Rules that a human reviewer enforced. Finder C checks each one and quotes it. Each line has its source. New lines come from the learn loop (`references/retro.md`), only after the user's yes.

- <rule>. (source: PR #<n>, reviewer <x>, <date>)

## Hot spots

Places where a small change breaks a lot: lock orders, hot synchronous paths, shared builders, the CI token scope. Finder D reads them.

- <place>: <what must stay true>.

## Models

- Overrides of the default model of a role, for example `reviewer: opus only`.
- UI part paths (built with Sonnet) and logic part paths (built with Opus), when the split is not clear from the change, for example `UI: templates/, *_screen.go; logic: internal/trade/, internal/store/`.

## Team posts

- Where the pane posts after the user's OK, in which voice, with what content. `none` when there are no posts.

## Merge

- Who merges and how (for example "the pane merges after the user's OK with `gh pr merge --merge --match-head-commit <sha>`", or "the team merges").

## Shared preview branch

- What the branch holds, who builds it, and what the pane checks there. `none` when there is none.

## Extra instructions

Anything that the sections above do not cover.
