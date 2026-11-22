# test-env: <repo>

A chunk of `~/.config/dispatch/<name>/BLACKFILE.md`. Read it before an e2e run, a manual test, or a live step with money.

## Where the branch runs

- Backend e2e: the test env and how to start it (a test bot, a test server, a local stack), how to claim it, and how to release it.
- UI e2e: the URL or the bot, the login, and the browser tool (`browser-harness` with an own `BU_NAME`).
- Manual test: where the user tests (the same env, or another).
- E2E time cap: `20` minutes.

## Money path

- What counts as a money path, and how to run it (for example "a real run on mainnet, so the order fills").
- Limits: the account, the asset, the most money for one test.
