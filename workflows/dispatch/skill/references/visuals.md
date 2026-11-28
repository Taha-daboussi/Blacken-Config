# Visuals: the plan and done pack

The user does not read long files. The pane sends a short visual pack to Telegram two times: at the plan approval (step 2, when the plan step runs) and at step 10 before it closes. The pack replaces the long text; the files stay in the task folder.

## Make it

1. Write `visual.json` in the task folder by `<skill>/templates/visual.md`: `"phase": "plan"` at step 2, `"phase": "done"` at step 10 (a new file; keep the plan one as `visual-plan.json`).
2. UI change at step 2 only: the "where we change" image.
   - Take a real screenshot of each changed screen today, on the base branch, with the test env and the tool of `test-env.md` and `design.md` (for example `browser-harness`, or the test bot). Save it in `shots/today/`.
   - Read the screenshot, and put one numbered box on each part that changes, in the pixels of the screenshot.
   - The after picture: the mockup that `design.md` names (for example `tg-mockup`, Figma, or an HTML copy). Save it in `shots/mockup/`. No mockup tool: leave `after` out and say so in the note lines.
   - One note line for each box: what changes there, for the user.
3. Run `dispatch-visual all visual.json visual/` in the task folder. A failure: fix the cause (a missing tool, a wrong path, a video over 3 minutes: cut the `say` texts). Never send a pack with a missing part without telling the user why.
4. Look at each image yourself before you send it: no cut text, the boxes on the right parts.

## Send it

With `claude-tg -t info -f <file> "<caption>"`, in this order:
1. `visual/card.png`: "<issue key>: plan card" (or "done card").
2. `visual/where.png` (UI only): "Where we change: today → after".
3. `visual/video.mp4`: "<issue key>: <n>-minute summary".
4. `visual/appendix.png`: "All details and the meaning of each word".

Then ask the questions or the approval in the pane, as before. A failed send: tell the user in the pane, with the error, and show the paths of the files.
