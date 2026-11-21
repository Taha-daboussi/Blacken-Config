# BLACKFILE: <name> (<owner>/<repo>)

The index of the workflow files of this repo: how a task moves from start to done. Private, and the only place for these rules, also outside dispatch. It wins over the skill files. Read a chunk before the work in its row. A skill line like "BLACKFILE.md 'Tests'" means the section `## Tests` in the chunk that lists it.

<!-- Keep this index under 3,000 characters: the SessionStart hook loads it into every session of the repo, and Claude Code cuts hook text at 10,000. Put details into the chunks. Write only facts that an agent cannot find in the code. Write `none` when the answer is "no", so `dispatch init` does not ask again. Never write a secret value: write where it lives. -->

## Project

- One line: what the product does, and who uses it.
- Remote: `<host>/<owner>/<repo>` (the loader `dispatch-context` matches this line).
- Main checkout: `<path>`. Default branch: `main`.

## Always

- Only the few rules that every session must see, also with no task: a production database that must never be touched, money limits, a chat that must never get a post, "the pane never merges". One line each, with the chunk that holds the details.

## Chunks

Each file is in `~/.config/dispatch/<name>/`.

| Chunk | Read before | Sections |
|---|---|---|
| `issues.md` | an issue write, a status change, a comment, a branch, a new task | Names, Issue tracker, Boards |
| `build.md` | code, the gate, the tests | Gate, Tests, File rules, Models |
| `test-env.md` | an e2e run, a manual test, a live step | Where the branch runs, Money path |
| `design.md` | a UI task | Design sources |
| `review.md` | a review | Team review tool, Review rules, Hot spots |
| `ship.md` | a PR, ready, merge, team posts | Team posts, Merge, Shared preview branch, PR rules |

## Custom

Niche jobs of this repo only (a chat bot to post in, a special test bot, a staging server, a mockup tool), one file per job in `custom/`. Leave this table empty when there are none. A standard chunk keeps one line that points to its custom file. Safety lines (never post in chat X, a money limit) also stay in "Always".

| File | Read before |
|---|---|
| `custom/<job>.md` | <the work that needs it> |

Learn files: `misses.md`, `misses/`, `evals/`.

## Extra instructions

- Free text from the user that fits no chunk. Keep it short; move long parts into a chunk.
