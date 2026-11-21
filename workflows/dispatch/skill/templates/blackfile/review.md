# review: <repo>

A chunk of `~/.config/dispatch/<name>/BLACKFILE.md`. Read it before a review (finders, final check, policy).

## Team review tool

- The repo's own review skill or command that the team runs on PRs (for example `.claude/skills/merge-blockers`). The review step runs it as the final check. `none` when there is none.
- Review policy: for example "fix only P0, P1 and UI problems" or "P2 blocks".

## Review rules

Rules that a human reviewer enforced. Finder C checks each one and quotes it. Each line has its source. New lines come from the learn loop (`references/retro.md`), only after the user's yes.

- <rule>. (source: PR #<n>, reviewer <x>, <date>)

## Hot spots

Places where a small change breaks a lot: lock orders, hot synchronous paths, shared builders, the CI token scope. Finder D reads them.

- <place>: <what must stay true>.
