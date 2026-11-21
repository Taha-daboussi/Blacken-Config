# Step 7: UI e2e

Three parts, cheapest first: a runner that only collects evidence, a script that compares the text with no tokens, and a fresh judge that never sees the code. The expected result was written before the code (step 3), so the test cannot bend to the code.

## Contents

- The pane
- Runner (sub-agent `dispatch-e2e-ui`)
- Script diff (`dispatch-ui-diff`)
- Judge (sub-agent `dispatch-ui-judge`)
- Report

## The pane

1. Claim the UI env of BLACKFILE.md "Where the branch runs" for the default branch. Start `dispatch-e2e-ui` with side `before`, the task folder, the env, a `BU_NAME` (`<slug>-before`), and the time cap (BLACKFILE.md, default 20 minutes). When `shots/before/run.json` exists from an earlier round, skip this.
2. Run the task branch on the env. Start `dispatch-e2e-ui` with side `after` (`BU_NAME` `<slug>-after`).
3. For each step with a screen: `dispatch-ui-diff --expected <task>/expected.md --step <N> --dom <task>/shots/after/<NN>.dom.txt --before <task>/shots/before/<NN>.png --after <task>/shots/after/<NN>.png --out <task>/judge/<NN>.diff.json`.
4. For each step with a line marked `← changed`, and each step where the script diff shows a difference: start one `dispatch-ui-judge` with only the paths of that step. Start all judges in one message. A step with no changed line and a clean script diff passes with no judge.
5. Write the report (below). A FAIL goes to "A fail" in step 7 of `references/pipeline.md`.

## Runner (sub-agent `dispatch-e2e-ui`)

1. Load `browser-harness`. Use only your `BU_NAME`, and open your own tab with `new_tab(url)`. Never drive a tab that you did not open.
2. Do the steps of `expected.md`, part "UI steps", in order. One action in each step. Find elements with the accessibility tree; use coordinates only when the tree lacks the element.
3. After each step, wait until the page is still (no spinner, the message arrived), then save in `shots/<side>/`:
   - `<NN>.png`: the screenshot of the area that the step names (the message, the dialog, the page). Use a full-page shot only when the step names the whole page.
   - `<NN>.dom.txt`: the visible text of that area, one line for each text line or button row, in screen order. For a button row write `[ label ] [ label ]`. Read it with `js(...)` (`innerText` of the area) or the accessibility tree. Keep each emoji and each space as the page shows it.
   - `<NN>.ocr.txt`: `tesseract <NN>.png <NN>.ocr` (the command adds `.txt`).
4. A step that you cannot do (no element, an error, a timeout): save the shot and the text, write the reason, and stop. Do not do the next step. Do not try a different path to the same screen.
5. Write `shots/<side>/run.json`:

```json
{"side": "after", "branch": "<branch>", "sha": "<sha>", "env": "<env>", "started": "<time>", "ended": "<time>",
 "steps": [{"n": 1, "action": "<the action>", "done": true, "png": "01.png", "dom": "01.dom.txt", "ocr": "01.ocr.txt", "note": ""}]}
```

6. The time cap ends the run. Write each step that you did not reach with `"done": false` and the note `time cap`. A step that you did not reach is never a pass.
7. Close your tab and stop your daemon: `BU_NAME=<name> browser-harness --reload`.

## Script diff (`dispatch-ui-diff`)

It reads the expected screen of the step, compares it line by line with the DOM text, and writes JSON:

- each expected line: `exact`, `missing`, or `different` (with the seen line), and whether it is marked `← changed`;
- each extra line in the DOM text that the expected screen does not have;
- the row order;
- `pixel`: the share of pixels that differ between the before and the after shot (`magick compare -metric AE`), and the path of the diff image.

The script decides nothing about design. It gives the judge exact facts, so the judge does not have to read the text from the image.

## Judge (sub-agent `dispatch-ui-judge`)

Input, only these paths: the expected screen of the step (with the `← changed` marks and the sources), `after/<NN>.png`, `<NN>.dom.txt`, `<NN>.ocr.txt`, `judge/<NN>.diff.json`, `before/<NN>.png`, and the source image when the step names one.

1. Look at the after shot. Compare each expected line with what the shot shows, word by word, emoji by emoji, row by row, in order. Use the DOM text and the script diff for the exact characters, and the shot for what the text cannot show: the order on screen, the layout, a cut word, a wrong icon, a color, an empty area, a spinner, an error.
2. Lines without `← changed` must look the same as in the before shot.
3. When the step names a source image, compare the changed lines with it too.
4. Each difference is a FAIL, also a small one (a word, an emoji, a space, the row order). A line that the shot does not show is a FAIL. When the shot is not clear enough to decide, the line is `UNCLEAR`, not a PASS.
5. Write `judge/<NN>.json`:

```json
{"step": 2, "verdict": "PASS | FAIL | UNCLEAR",
 "lines": [{"expected": "[ ← Back ]", "seen": "[ ⬅️ Back ]", "verdict": "FAIL", "why": "icon differs", "changed": true}],
 "other": ["<a problem on the screen that no line names: an error banner, a cut text>"]}
```

The step verdict is FAIL when one line is FAIL, UNCLEAR when one line is UNCLEAR and none is FAIL, else PASS. Something in `other` makes the step FAIL.

## Report

Write in `report.md`, part "E2E (UI)": one line for each step with the action, PASS, FAIL, UNCLEAR, or NOT RUN, the before shot, the after shot, and the source image. An UNCLEAR step goes to the user in the test message (step 9) as "check this". Then release the env and close the tabs.
