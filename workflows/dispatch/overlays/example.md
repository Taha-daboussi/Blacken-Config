# Dispatch in <repo>

Copy this file to `~/.config/dispatch/overlays/<repo>.md`, where `<repo>` is the folder name of the main checkout. Keep it private: it is the place for client names, channel ids, test bots, server hosts and board ids. It wins over `SKILL.md` and `review.md` where they differ. Leave out each section that does not apply.

## Names

- Branch: `fix/<key>-<slug>` and `feat/<key>-<slug>` (default), or the repo rule, for example `<author>/<issue>`.

## Gate and tests

- Gate without tests: for example `go build ./... && go vet ./...`, or `pnpm --filter <workspace> typecheck` and `lint`.
- Test checks in CI: the name of the check that must be green after `gh pr ready`.

## Where the branch runs

- How the E2E and Manual Test agents run the branch (a test bot, a test site, a preview), and how they release it.
- Money path rule: when a step moves real money, how to run it.

## Design sources (UI tasks)

- The design sources in order (client instructions, a token list, reference apps), and where the agent asks when no source answers.

## Shared preview branch (SKILL.md section 9)

- What the branch holds, who builds it, and what the agents check there.

## Linear and boards

- The Linear workspace and team, and the status at each step (In Progress, In Review, Done).
- Board cards (Trello, GitHub Projects): when to add, link and move them.

## Team posts (review.md step 6)

- Where the Manual Test agent posts after the user's OK, in which voice, and with what content. No section: no posts.

## Merge

- Whether the Manual Test agent merges the PR after the user's OK, and how.
