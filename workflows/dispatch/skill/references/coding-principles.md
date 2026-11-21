# Coding principles

The builder reads this file before it writes code. It holds the rules of `ponytail`, `thermo-nuclear-code-quality-review` and the anti-slop lint, so that the pipeline does not run those skills after the build. Repo rules (CLAUDE.md, AGENTS.md, BLACKFILE.md) win over this file.

## 1. Understand first

- Read the task, the code it touches, and every caller of each function you change. Trace the real flow end to end before you climb the ladder below.
- A bug report names a symptom. Fix the cause at the place that all callers share. A guard in one caller comes back as the next bug.

## 2. The ladder: stop at the first rung that holds

1. Does this need to exist at all? A speculative need: skip it, and say so in one line.
2. Is it already in this codebase? A helper, a type, a builder, a pattern: reuse it. A copy of code that lives a few files away is the most common fault.
3. Does the standard library do it? Use it.
4. Does the platform do it? A DB constraint over app code, CSS over JS, a native input over a library.
5. Does an installed dependency do it? Use it. Never add a dependency for what a few lines can do.
6. Then write the minimum code that works.

## 3. Structure

- No abstraction with one user: no interface with one implementation, no factory for one product, no option for a value that never changes, no wrapper that only passes the call on.
- No ad hoc `if` in an unrelated flow. When a feature needs a special case in shared code, give it its own function, state, or module.
- One concept, one home. Put logic in the layer and package that already own the concept. Do not let feature logic leak into shared code.
- Delete before you add. A change that removes a branch, a flag, or a layer beats a change that moves it.
- Do not push a file from under 1000 lines to over 1000 lines. Split it first.
- When a new builder or helper replaces the old form of a shared control, delete the old one in the same change. Then each open PR that still calls it fails to build at the merge, and nobody misses it. (Retro 2026-11-21, PR #113: the old progress bar stayed next to the new one, and 4 open PRs kept using it.)
- Keep related writes atomic. Do not leave state half applied when one step fails.
- Run independent work in parallel only when that is also simpler.

## 4. Types and boundaries

- Validate external data at the edge (a request, a file, an API reply, a chat message). A type on external data checks nothing.
- No `any`, `unknown`, chained casts, or "widen then assert" to hide an unclear contract. Make the boundary explicit.
- No optional parameter or nullable mode that only one caller uses.
- No silent fallback that hides a broken invariant.

## 5. Lifecycle and concurrency (money, jobs, orders)

- Take locks in the same order as every other writer to the same tables.
- Pause, delete, and "done" must stop the work that is in flight. Check the state again when the work fires.
- A move or a swap must not let stale events from the old source act on the new one.
- An edit goes through the same validation as a create.
- No slow I/O (a network call, an alert, a DB scan) in a hot synchronous path. Put a timeout on each outside call.
- Before you add a periodic job or scan, write its cost (calls per day, tokens, money) in the PR body.

## 6. Small things the lint catches (do them right the first time)

- Readable spacing between blocks. No `filter().map()` chain where one loop is clearer. No accumulator copy inside `reduce`.
- No `typeof` checks at run time for values whose type the code already knows.
- No names that repeat the shape of the value (`userObj`, `idString`).

## 7. What not to write

- No code comments, unless the repo rules ask for them.
- No scaffolding "for later", no dead code, no unused exports.
- No test for a case that no real caller can reach.
- No extra error handling "to be safe" that the repo rules do not ask for. When the repo rules ask for logs and error handling in each change (ROAS does), follow them.

## 8. Simplify step (after the build)

The pane runs `/simplify` one time on the files that the branch changed, then the anti-slop lint when BLACKFILE.md names it. Decline each `/simplify` change that removes a log or error handling that a repo rule asks for, or that changes a file outside the branch diff.
