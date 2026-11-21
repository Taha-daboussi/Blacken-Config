# Step 7: Backend e2e

The backend e2e runs the real path of the change on the test env of BLACKFILE.md: the bot command, the API call, the job, the DB read, or the log line that `expected.md` names. The evidence is the command output, not the agent's words.

## The pane

1. Claim the backend env of BLACKFILE.md "Where the branch runs" and run the task branch there.
2. Start `dispatch-e2e-backend` with the task folder, the worktree, the env, and the time cap.
3. Read `e2e-backend.md`. A FAIL or NOT RUN goes to "A fail" in step 7 of `references/pipeline.md`. Release the env.

## Runner (sub-agent `dispatch-e2e-backend`)

1. For each block `B<n>` of `expected.md`, part "Backend checks": do the setup, then run the command exactly as written. Save the command and its full output to `evidence/B<n>.txt`. For a log check, save the log lines with their timestamps. For a DB check, save the query and its rows (read-only queries only).
2. PASS only when the saved output shows the `Expect` text. When the output differs, the check is FAIL, with the line that differs.
3. A check that you cannot run (no env, no access, a setup that fails): NOT RUN, with the reason. Never a PASS.
4. Money path: follow BLACKFILE.md "Money path" exactly, with its limits. A run that BLACKFILE.md calls real must be real (for example an order that fills on chain). Save the transaction id or the order id.
5. Never edit code. Never write to a production database. Never send a message to a person who is not in BLACKFILE.md as a test target.
6. Write `e2e-backend.md` in the task folder:

```
B1 <what it proves>: PASS | FAIL | NOT RUN. Evidence: evidence/B1.txt. <one line: the expected text and the seen text>
```
