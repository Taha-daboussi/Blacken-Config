# Step 2: Plan and grill

## When to plan

Plan when one of these is true, unless the prompt says `--no-plan`:

- The task adds a new screen, or changes 2 or more screens.
- The task adds a migration or a new table.
- The task touches a money path (BLACKFILE.md "Money path").
- The task holds 2 or more issues.
- The issue or the spec leaves a decision open (a product choice, a design with no source, two sources that disagree).

`--plan` in the prompt: always plan. Write the reason in `report.md`.

## Planner (sub-agent `dispatch-planner`)

1. Read `task.md`, BLACKFILE.md, the issue and its comments, the spec and its images, the misses of the area, and the code that the task touches: each caller of each function that will change, and each screen of the same family.
2. Find each fact yourself. A fact is not a question for the user.
3. Write `plan.md`:
   - Goal: one paragraph.
   - Changes: the files and functions, the shared builders or helpers to reuse, the migration order, the money-path order.
   - Screens: each screen that changes, and each other screen of the same family.
   - Risks: callers, old rows, two actors at the same time, pause or delete with work in flight.
   - Not in scope.
4. Write `questions.md` as a design tree: each open decision, what it depends on, the options, and your recommendation with the reason. Mark the frontier: the decisions whose prerequisites are settled.

## Grill rounds (the pane)

Use the method of the `grilling` skill. Load it with the Skill tool when it is installed.

1. Run `dispatch-step 2 plan --wait "plan questions for <issue key>"`.
2. Ask the whole frontier in one round with `AskUserQuestion` (max 4 questions in one call; use 2 calls for a bigger frontier). Put the recommended option first, with "(Recommended)". Write each question so that it stands alone, in simple English.
3. Each answer settles a branch and opens the next frontier. Ask the next round. A question whose answer depends on an open question of this round belongs to a later round.
4. A question that needs a fact: start a sub-agent to find it, and ask the rest of the frontier now.
5. Stop when the frontier is empty. Write each answer into `plan.md` and close `questions.md`.

## Glossary and decisions

Follow BLACKFILE.md "File rules", line "Glossary and ADRs".

- `allowed`: use the `domain-modeling` skill during the grill. A term that the user and you settle goes into `GLOSSARY.md`. A decision that is hard to reverse, surprising, and a real trade-off goes into `docs/adr/NNNN-<slug>.md`. Commit them on the task branch with the code.
- `ask first`: ask the user before you write each file.
- `never`, or no line: write the terms and decisions only in `plan.md`.

## Critic (sub-agent `dispatch-critic`)

After the grill, start `dispatch-critic` with the task folder. Each gap in `critic.md`: correct `plan.md`, or ask the user when it is a decision. One critic round only; a second round only when you changed the plan a lot.

## Approval

Show the user the plan in 15 lines or less: the goal, the changes, the screens, the risks, the open items. Wait for the yes (`--wait`). Then continue with step 3.
