# build: <repo>

A chunk of `~/.config/dispatch/<name>/BLACKFILE.md`. Read it before code, the gate, and the tests.

## Gate

- Command (build, vet, lint; no tests here): for example `timeout 900 go build ./... && go vet ./...`, or `none`.
- Lint rule: for example "only new lint errors count; compare with clean main".

## Rule scan

Rules that a script checks on each added line of the branch (`dispatch-rule-scan`, step 5), or `none`. A hit is a fix round, so name only rules with no exceptions in normal code. POSIX ERE (use `[[:space:]]`, not `\s`). Examples:

- no code comments: added `^[[:space:]]*(//|/\*|\*[[:space:]])` in `\.(go|ts|tsx|js)$` except `//(go:|nolint|export )`
- no type-only imports: added `import[[:space:]]+type[[:space:]]|[{,][[:space:]]*type[[:space:]]` in `\.(ts|tsx)$`
- no raw console: added `console\.(log|warn|error|info|debug)\(` in `^apps/` except `createWebLogger`
- no test edits: file `(\.test\.|\.spec\.|/__tests__/|_test\.go$)`

## Tests

- Scoped local command: the tests of the changed packages and of the packages that import them, or `none`.
- CI check: the name of the check that must be green, or `none`.
- CI trigger: for example "post `/test` on the PR", "runs on ready", or `none`.

## File rules

- Test edits: `allowed` or `ask first` or `never`.
- Markdown edits: `allowed` or `ask first` or `never`.
- Glossary and ADRs in the repo (`GLOSSARY.md`, `docs/adr/`): `allowed` or `ask first` or `never`.

## Models

- Overrides of the default model of a role, for example `reviewer: opus only`.
- UI part paths (built with Sonnet) and logic part paths (built with Opus), when the split is not clear from the change, for example `UI: templates/, *_screen.go; logic: internal/trade/, internal/store/`.
