# Question form

Every decision that the pane asks the user uses this form: plan questions, expected-result questions, builder questions, feedback decisions, and retro mitigations. One decision per question. Simple English (ASD-STE100): short sentences, common words, no idioms.

## Form

1. Situation: <what we do now, and what we found, in 1 to 2 sentences>
2. Problem: <what is not decided, and why it matters for the user or the business, in 1 sentence>
3. Words: <each hard word in this question, with a simple meaning; omit when there is none>
4. Options (max 3), each with:
   - What it means: <1 sentence>
   - What happens: <a concrete scenario: who sees what, and when>
   - Cost: <time, money, or calls>
   - Risk: <what can go wrong>
   - Undo: <yes / no, and how>
5. Question: <1 sentence>

## Pick first

- Do not show the recommendation in the question. Do not mark an option "(Recommended)", and do not put the recommended option first because it is the recommendation.
- Ask the user to pick and to give the reason in one line.
- After the answer, show your pick and its reason in 1 to 2 lines.
- The same pick: go on.
- A different pick: give the one fact that the user may not know, in 1 to 2 lines, and ask one time: "keep your pick, or change it?". The user's last answer wins. Write it in `handoff.md` "Decisions".
- `AskUserQuestion`: each option label is the option in 1 to 5 words; the description holds "What happens", "Risk", and "Undo". Put "Situation", "Problem", and "Words" into the question text, so the question stands alone.
