# Expected: <issue key> <one-line title>

Written by `dispatch-spec` before any code, only from the sources below. The builder never edits this file. A line with no source is a question for the user, not an expectation.

## Sources

- <the issue, the spec doc, the images, the client messages, the design sources of BLACKFILE.md>

## Acceptance

- [ ] <one result that a user or an operator sees> (source: <link or path>)

## Kind

UI | backend | both

## Out of scope

- <what looks related, but this task does not change>

## Backend checks (backend or both)

One block for each check. The e2e agent runs it and saves the output as evidence.

### B1. <what it proves>
- Setup: <account, data, env>
- Run: <the exact command, request, bot message, or job>
- Expect: <the output, the log line, the DB row, the state>
- Money path: no | <chain, order state, limit>

## UI steps (UI or both)

The full flow from the first screen to the change, one action in each step. A step that shows a changed screen has the full screen as text: each text line, then each button row with the labels in order, emoji included. Mark each changed line with `← changed` and its source. Lines without the mark must stay the same as on the default branch.

### Setup
- <what the test needs first>

### Steps
1. <one action: open, tap, send, type>
   Expect: <the screen name>
2. Tap `<label exactly as the app shows it>`.
   Expect: <the screen name>:
     <text line>
     [ ◀️ ] [ 1/3 ] [ ▶️ ]
     [ ← Back ]          ← changed (source: <link or path>)

## Other screens of the same family

- <screen> (<file:line on origin/<default>> | PR #<n> <file:line>): changes in this PR | changes in PR #<n> | follow-up issue

Each screen that shows the same control, also when the issue does not name it, also on other open PRs. A screen that only an open PR has cannot change in this PR: the pane tells the user in step 3, and the owner PR takes the shared builder (or a follow-up issue does it after both merge).
