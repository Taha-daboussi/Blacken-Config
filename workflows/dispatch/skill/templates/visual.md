# Visual: `visual.json`

The pane writes `visual.json` in the task folder two times: at the plan approval (`"phase": "plan"`) and at step 10 (`"phase": "done"`). `dispatch-visual all visual.json visual/` makes the images and the video. Rules: `references/visuals.md`.

Write for a reader who knows nothing about the code. Simple English (ASD-STE100). Mark each hard word with `**word**`, and give its meaning in the same line or in "words". Facts only from `plan.md` (the business brief), `report.md`, and the sources. Leave out a key that does not apply.

```json
{
  "key": "DAWN-163",
  "title": "Make fewer calls to Codex",
  "phase": "plan",
  "card": {
    "problem": "Dawn makes 386,000 **calls** a day to **Codex**, a paid data service.",
    "fix": "Ask about 200 coins in one call (a **batch**).",
    "result": "About 300,000 calls a day. Users see no change.",
    "risk": "A wrong supply number shows a wrong market cap.",
    "money": "no",
    "undo": "yes, one revert",
    "numbers": [{"label": "Codex calls a day", "before": "386K", "after": "300K", "note": "estimate"}]
  },
  "words": [{"word": "batch", "meaning": "one call with many questions inside", "example": "one trip to the shop for 200 items"}],
  "decisions_taken": [{"decision": "Do not touch the TP/SL check.", "why": "It sells coins by itself; a mistake can lose user money."}],
  "open_decisions": [{"question": "Batch the fee payer checks?", "options": ["A: everywhere", "B: main servers only", "C: not now"]}],
  "risks": ["..."],
  "not_doing": ["..."],
  "sources": ["plan.md", "dawn-knowledge/codex/usage.md"],
  "where": {
    "today": "shots/before/panel.png",
    "after": "shots/mockup/panel.png",
    "boxes": [{"n": 1, "x": 40, "y": 310, "w": 620, "h": 90, "note": "The Buy button moves to the first row."}]
  },
  "video": [
    {"part": "1 · THE TASK", "title": "Make fewer calls to Codex", "lines": ["**Codex** = a paid service that gives coin data."], "say": "This is Dawn task 163. ..."}
  ]
}
```

- `card`: max 4 short boxes and max 3 numbers. One image, no scroll.
- `words`: every hard word of the card, the video, and the plan. One sentence each.
- `decisions_taken`: each decision of the plan and the user, with its reason.
- `open_decisions`: only at `"phase": "plan"`. The same order as the questions. No recommendation.
- `where`: only for a UI change. `today` is a real screenshot of the screen today (the base branch, the same data). The box numbers are in the pixels of that screenshot. `after` is the after picture: the mockup of `design.md` (for example `tg-mockup`, Figma, or an HTML copy). Paths are relative to `visual.json`.
- `video`: the 6 parts, in this order:
  1. The task: what and for whom.
  2. The problem: what is wrong today, with a number.
  3. The fix: what changes, with one real-life example.
  4. Decisions taken: max 2, each with its reason.
  5. Result and risk: the number after, what can go wrong, undo.
  6. Your decisions: max 3 (`plan`), or what to check now (`done`).
  Each part: one title, max 3 lines, and a `say` text. All `say` texts together: about 300 words (2 minutes). Max 450 words (3 minutes) for a big task. Each hard word gets one short sentence the first time.
