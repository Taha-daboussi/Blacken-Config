# Init: write BLACKFILE.md for a repo

`dispatch --type init` starts a pane in the main checkout. The goal is a filled `~/.config/dispatch/<name>/` folder (the `BLACKFILE.md` index and its six chunks), checked by the user. Facts come from the repo. Decisions come from the user.

1. `dispatch-step 1 init`. Make `~/.config/dispatch/<repo>/` (mode 700) when it is missing.
2. Read the templates in `~/.claude/skills/dispatch/templates/blackfile/` (the index and the six chunks).
3. Collect the facts, and note the source of each one:
   - the old overlay `~/.config/dispatch/overlays/<repo>.md` when it exists (it holds most of the answers);
   - `CLAUDE.md`, `AGENTS.md`, `.claude/rules/`, `README.md`, the PR template;
   - `.github/workflows/` (the test check, its triggers, a `/review` or `/test` comment trigger);
   - the build files (`go.mod`, `package.json` scripts, `Makefile`) for the gate and the scoped test command;
   - `.claude/skills/` in the repo, for a team review skill (for example `merge-blockers`);
   - the memory files of the project that name test bots, test servers, boards, and issue workspaces.
4. Write a draft of each section from the facts, in the chunk that the template names. The index gets only the project lines (one `Remote:` line for each remote that is this repo, for example `origin` and the team `upstream` of a fork), the "Always" rules, and the chunk table, under 3,000 characters. Put a niche job of this repo only (team posts in a chat app, a special test bot, a staging server, a mockup tool) into its own `custom/<job>.md`, list it in the "Custom" table, and leave one pointer line in the standard chunk. Mark each line that you could not fill with `TODO:`.
5. Grill the user on the `TODO:` lines only, in rounds (`references/planning.md`, "Grill rounds"): one question for each decision, the recommended option first. Run `dispatch-step 1 init --wait "BLACKFILE questions"` while you wait.
6. Show the user the index and the chunks, and wait for the yes. Then save it, and commit it in the private config repo: when `~/.config/dispatch` is not a git repo yet, run `git -C ~/.config/dispatch init` first (local only, no remote; the learn loop drafts its BLACKFILE changes on branches there). Make the learn files: `misses.md` (empty), `misses/`, `evals/assets/`. When an old overlay existed, move it to `~/.local/state/dispatch/overlay-backup/<time>/`.
7. Update: "update BLACKFILE" with a topic starts the same steps for that section only.
8. Close the pane (`references/pipeline.md`, "Close the pane", without the git steps).

Rules: never write a secret value (a token, a password, a key) into BLACKFILE.md. Write where the secret lives instead (for example "key in `~/.config/x/key`").
