# Step 7: UI e2e

Three parts, cheapest first: a runner that only collects evidence, a script that compares the text with no tokens, and a fresh judge that never sees the code. The expected result was written before the code (step 3), so the test cannot bend to the code.

## Contents

- The pane
- Runner (sub-agent `dispatch-e2e-ui`)
- Script diff (`dispatch-ui-diff`)
- Judge (sub-agent `dispatch-ui-judge`)
- Report

## The pane

0. **Passes.** A desktop pass always runs (sides `before` and `after`). A **phone pass** (sides `before-phone` and `after-phone`) also runs for a web app (the UI env is a URL, not a chat app in a browser) when the task is UI or the branch changes a style file. A style file: `git diff --name-only origin/<default>...HEAD` shows `.css`, `.scss`, `.sass`, `.less`, a `tailwind.config.*` or `postcss.config.*`, or a token or theme file that `design.md` names. The phone size is the phone width of `design.md` "Screen variants" (default 390x844). Run the passes one after the other, never at the same time on one env. Tell each runner whether the branch changes a style file.
1. Claim the UI env of BLACKFILE.md "Where the branch runs" for the default branch. Start `dispatch-e2e-ui` with side `before`, the task folder, the env, a `BU_NAME` (`<slug>-before`), and the time cap (BLACKFILE.md, default 20 minutes; the cap is for each pass). Then side `before-phone` (`BU_NAME` `<slug>-before-phone`) when the phone pass runs. Skip a side when its `run.json` exists from an earlier round.
2. Run the task branch on the env. Start `dispatch-e2e-ui` with side `after` (`BU_NAME` `<slug>-after`), then side `after-phone` when the phone pass runs.
3. Script checks, no judge: a step is FAIL when its `<NN>.errors.json` (side `after` or `after-phone`) has an entry, or when its `<NN>.layout.json` (side `after-phone`) says that the page scrolls to the side, unless `expected.md` names that error or that scroll as expected. The entries are the reason.
4. For each step with a screen, and for each pass: `dispatch-ui-diff --expected <task>/expected.md --step <N> --dom <task>/shots/<after side>/<NN>.dom.txt --before <task>/shots/<before side>/<NN>.png --after <task>/shots/<after side>/<NN>.png --out <task>/judge/<NN>[-phone].diff.json`.
5. Start one `dispatch-ui-judge` for each step and pass that has a line marked `← changed`, a difference in the script diff, or variant shots. When the branch changes a style file, also for every other step with a screen, on both passes: a style change can break a screen that the task does not name. Give each judge only the paths of its step and pass (the variant shots too), and tell it the pass (`desktop` or `phone`). Start all judges in one message. Any other step passes with no judge.
6. Write the report (below). A FAIL goes to "A fail" in step 7 of `references/pipeline.md`.

## Runner (sub-agent `dispatch-e2e-ui`)

1. Load `browser-harness`. Use only your `BU_NAME`, and open your own tab with `new_tab(url)`. Never drive a tab that you did not open. On side `before-phone` or `after-phone`, before you load the first page, set the phone size for the whole run: `cdp("Emulation.setDeviceMetricsOverride", width=W, height=H, deviceScaleFactor=3, mobile=True)` and `cdp("Emulation.setTouchEmulationEnabled", enabled=True)` (W and H from the pane, default 390x844).
2. **Error recorder** (only for a web app of this repo, not for a chat app in a browser such as Telegram Web): before you open the first page, run `cdp("Page.addScriptToEvaluateOnNewDocument", source=REC)` with the recorder below, so it runs on each page load. It records page errors, `console.error` lines, and each request that fails or answers 400 or more.

```js
window.__dx=[];const p=(k,m)=>__dx.push({kind:k,msg:String(m).slice(0,300)});
addEventListener('error',e=>p('error',e.message||(e.target&&(e.target.src||e.target.href))),true);
addEventListener('unhandledrejection',e=>p('rejection',e.reason&&e.reason.message||e.reason));
const ce=console.error;console.error=(...a)=>{p('console',a.join(' '));ce(...a)};
const f=fetch;window.fetch=async(...a)=>{const u=a[0]&&a[0].url||a[0];try{const r=await f(...a);if(r.status>=400)p('http',r.status+' '+u);return r}catch(e){p('http','failed '+u);throw e}};
const o=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){this.addEventListener('loadend',()=>{if(this.status===0||this.status>=400)p('http',(this.status||'failed')+' '+u)});return o.apply(this,arguments)};
```

3. Do the steps of `expected.md`, part "UI steps", in order. One action in each step. Find elements with the accessibility tree; use coordinates only when the tree lacks the element.
4. After each step, wait until the page is still (no spinner, the message arrived), then save in `shots/<side>/`:
   - `<NN>.png`: the screenshot of the area that the step names (the message, the dialog, the page). Use a full-page shot only when the step names the whole page.
   - `<NN>.dom.txt`: the visible text of that area, one line for each text line or button row, in screen order. For a button row write `[ label ] [ label ]`. Read it with `js(...)` (`innerText` of the area) or the accessibility tree. Keep each emoji and each space as the page shows it.
   - `<NN>.ocr.txt`: `tesseract <NN>.png <NN>.ocr` (the command adds `.txt`).
   - `<NN>.errors.json` (web app only): `js("JSON.stringify(window.__dx.splice(0))")`, plus each resource that answered 400 or more (`performance.getEntriesByType('resource')` with `responseStatus >= 400`, only the ones new since the last step). Keep only the `http` entries whose host is in "UI error check" of `test-env.md` (default: the host of the UI e2e URL); keep all other entries. Write `[]` when there is none.
   - `<NN>.layout.json` (phone sides only): `js("JSON.stringify({width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, scale: visualViewport.scale, sideScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1})")`. Do not use `innerWidth`: on a phone the browser zooms out to fit a page that is too wide, so `innerWidth` grows with the page.
   - **Theme variants**, only on side `after` or `after-phone`, for a step with a line marked `← changed` (every step with a screen when the pane says that the branch changes a style file), and only when `design.md` "Screen variants" names themes: for each other theme, switch in place with no new action (`cdp("Emulation.setEmulatedMedia", features=[{"name": "prefers-color-scheme", "value": "dark"}])` or the theme switch that `design.md` names), wait until the page is still, and save `<NN>.<theme>.png` and `<NN>.<theme>.dom.txt`. Then go back to the first theme. The widths are passes (the pane), not variants.
5. A step that you cannot do (no element, an error, a timeout): save the shot and the text, write the reason, and stop. Do not do the next step. Do not try a different path to the same screen.
6. Write `shots/<side>/run.json`:

```json
{"side": "after", "branch": "<branch>", "sha": "<sha>", "env": "<env>", "started": "<time>", "ended": "<time>",
 "steps": [{"n": 1, "action": "<the action>", "done": true, "png": "01.png", "dom": "01.dom.txt", "ocr": "01.ocr.txt",
            "errors": "01.errors.json", "layout": "01.layout.json", "variants": ["dark"], "note": ""}]}
```

7. The time cap ends the run. Write each step that you did not reach with `"done": false` and the note `time cap`. A step that you did not reach is never a pass.
8. Close your tab and stop your daemon: `BU_NAME=<name> browser-harness --reload`.

## Script diff (`dispatch-ui-diff`)

It reads the expected screen of the step, compares it line by line with the DOM text, and writes JSON:

- each expected line: `exact`, `missing`, or `different` (with the seen line), and whether it is marked `← changed`;
- each extra line in the DOM text that the expected screen does not have;
- the row order;
- `pixel`: the share of pixels that differ between the before and the after shot (`magick compare -metric AE`), and the path of the diff image.

The script decides nothing about design. It gives the judge exact facts, so the judge does not have to read the text from the image.

## Judge (sub-agent `dispatch-ui-judge`)

Input, only these paths: the expected screen of the step (with the `← changed` marks and the sources), `after/<NN>.png`, `<NN>.dom.txt`, `<NN>.ocr.txt`, `judge/<NN>.diff.json`, `before/<NN>.png`, the variant shots `after/<NN>.<variant>.png` with their DOM text, and the source image when the step names one.

1. Look at the after shot. Compare each expected line with what the shot shows, word by word, emoji by emoji, row by row, in order. Use the DOM text and the script diff for the exact characters, and the shot for what the text cannot show: the order on screen, the layout, a cut word, a wrong icon, a color, an empty area, a spinner, an error.
2. Lines without `← changed` must look the same as in the before shot.
3. When the step names a source image, compare the changed lines with it too.
4. The phone pass, and each variant shot: the same lines must show, and the layout must work at that width and theme. A FAIL is text that is cut or runs off the screen, a page that scrolls to the side, parts that overlap, a control that is hidden or too small to tap, and text or icons with too little contrast in that theme. Write each variant line with `"variant": "<name>"`.
5. Each difference is a FAIL, also a small one (a word, an emoji, a space, the row order). A line that the shot does not show is a FAIL. When the shot is not clear enough to decide, the line is `UNCLEAR`, not a PASS.
6. Write `judge/<NN>.json`:

```json
{"step": 2, "verdict": "PASS | FAIL | UNCLEAR",
 "lines": [{"expected": "[ ← Back ]", "seen": "[ ⬅️ Back ]", "verdict": "FAIL", "why": "icon differs", "changed": true}],
 "other": ["<a problem on the screen that no line names: an error banner, a cut text>"]}
```

The step verdict is FAIL when one line is FAIL, UNCLEAR when one line is UNCLEAR and none is FAIL, else PASS. Something in `other` makes the step FAIL.

## Report

Write in `report.md`, part "E2E (UI)": one line for each step and pass (desktop, phone) with the action, PASS, FAIL, UNCLEAR, or NOT RUN, the number of recorded errors, the side scroll on phone, the theme variants and their verdicts, the before shot, the after shot, and the source image. An UNCLEAR step goes to the user in the test message (step 9) as "check this". Then release the env and close the tabs.
