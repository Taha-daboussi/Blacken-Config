# Init: write BLACKFILE.md for a repo

`dispatch --type init` starts a pane in the main checkout. The goal is a filled `~/.config/dispatch/<repo>/BLACKFILE.md`, checked by the user. Facts come from the repo. Decisions come from the user.

1. `dispatch-step 1 init`. Make `~/.config/dispatch/<repo>/` (mode 700) when it is missing.
2. Read the template `~/.claude/skills/dispatch/templates/BLACKFILE.md`.
3. Collect the facts, and note the source of each one:
   - the old overlay `~/.config/dispatch/overlays/<repo>.md` when it exists (it holds most of the answers);
   - `CLAUDE.md`, `AGENTS.md`, `.claude/rules/`, `README.md`, the PR template;
   - `.github/workflows/` (the test check, its triggers, a `/review` or `/test` comment trigger);
   - the build files (`go.mod`, `package.json` scripts, `Makefile`) for the gate and the scoped test command;
   - `.claude/skills/` in the repo, for a team review skill (for example `merge-blockers`);
   - the memory files of the project that name test bots, test servers, boards, and issue workspaces.
4. Write a draft of each section from the facts. Mark each line that you could not fill with `TODO:`.
5. Grill the user on the `TODO:` lines only, in rounds (`references/planning.md`, "Grill rounds"): one question for each decision, the recommended option first. Run `dispatch-step 1 init --wait "BLACKFILE questions"` while you wait.
6. Show the user the full file and wait for the yes. Then save it. When an old overlay existed, move it to `~/.local/state/dispatch/overlay-backup/<time>/`.
7. Update: "update BLACKFILE" with a topic starts the same steps for that section only.
8. Close the pane (`references/pipeline.md`, "Close the pane", without the git steps).

Rules: never write a secret value (a token, a password, a key) into BLACKFILE.md. Write where the secret lives instead (for example "key in `~/.config/x/key`").
