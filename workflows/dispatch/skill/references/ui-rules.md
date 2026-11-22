# UI rules (every UI or UX task)

The user added these rules on 2026-11-18 and 2026-11-19, after a client tested a preview with all open PRs and found many problems. The causes were: nobody compared the screens with the spec; the existing code won over the spec; parallel PRs did not check each other, so one control had five layouts; the first test of all PRs together was the client's; agents guessed when there was no mockup; nobody tested with bad data or opened a screen many times; two agents built the same feature; and the work went too fast. BLACKFILE.md "Design sources" adds the project parts (the sources in order, a token list, a mockup tool).

## One control, one form

One control (a button, a row, a title, a label, an icon, a format) has one form on every screen of the app.

- **Look first.** Before a part gets a form, find the same control in the app and its builder (the shared function or component that makes it).
- **A form in use continues.** When the app already has a form for the control (the word, the icon, the place in the row, the builder), use that exact form. Do not take a different form from a reference app or a doc image for one screen.
- **A change is a change for every screen.** When the user or the client changes a shared control, the builder and each screen with that control change in one PR, never one screen only.
- **Two forms in the app are a bug.** Do not add a third form. Log the two forms in the issue tracker and ask the user which form wins.

## Where the design comes from (the agent never decides the design)

The user's rule: "we dont want you to decide the design here". For each part of a screen, use the spec (the issue, the spec doc and its images, the client messages), then "Design sources" of the BLACKFILE chunk `design.md`, in their order. When no source answers, or the sources disagree: do not guess and do not pick a form. Ask the user and wait.

- A part with no source is a question, not a design. For a new part, our own code and an older screen of ours are not a source. For a control that the app already has, the form in use is not a new design: continue with it.
- `expected.md` writes the source next to each changed line.

## No mockup, no guess

When the task asks for a new layout or new formatting and there is no spec image or example, stop before code. Follow "Design sources" (and the mockup rules of BLACKFILE.md). Build only after the answer.

## The spec wins over the existing code

When an existing helper, preset, or default gives a different result from the spec (a different number of buttons, an extra Refresh, a different row), follow the spec, and note the place in `report.md`. This rule is about what a screen has: its rows, its buttons, its values. The word and the icon of a shared control (Back, Close, Refresh, Cancel) follow "One control, one form".

## One builder for one control

Before you build a control (an amount row, a settings row, manage rows, a progress bar, a prompt), find where the other flows show it. Reuse or extract one builder, and change every screen that uses it. Never copy a control into your flow and change the copy. When the builder is only on an open PR branch and not on the default branch, stop and tell the user: the task belongs on that owner branch.

## Same family, every screen

A change that the issue asks for on one screen applies to each screen of the same family that shows the same control, unless the issue says it is for one screen only. `expected.md` lists those screens.

## Open PRs on the same code

Run `gh pr list --state open` and look at the PRs that touch the same files, or whose added lines call the same builder or show the same label. List each screen of the same family that they show in `expected.md` ("Other screens of the same family"), and note the PRs in `report.md`, so the review and the user can check them.

## Bad data and repeat

For a screen that loads data, `expected.md` has one step that opens the same screen two times, and one step with empty or missing data when the real data can be empty.
