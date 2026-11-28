# Business brief: <task key>

The first section of `plan.md`. It tells the user why the task exists, in simple English, before any code fact. Each line ends with its source: `[fact: <library file, issue, PR, Grafana query, user>]` or `[guess]`. A guess is never allowed in "Value", "Risk", "Success", or "Why now": write the line under "Unknown" instead.

## Business brief

1. Problem: <who has which pain, in one sentence> [fact: ...]
2. Who: <the user type, how many, free or paid> [fact: ...]
3. Job: When <situation>, they want to <goal>, so they can <result>. [fact: ...]
4. Value: <the money, time, or trust that we gain or save> [fact: ...]
5. Risk: <what breaks if we are wrong: user funds, ad spend, trust, legal> [fact: ...]
6. Money path: <does it touch user funds or ad spend? yes / no, where> [fact: ...]
7. Success: <one number or one visible sign, and where to see it> [fact: ...]
8. Not doing: <what we leave out on purpose, and why>
9. Why now: <the last answer of the 5 whys> [fact: ...]
10. Tech to business: <each key choice of the plan -> its effect for the user or the business>
11. Unknown: <each fact that the library, the issue, and the code do not give> -> ask the user
12. Library: <the library files that gave facts, or "no library">

## Words

Each technical or domain word that the plan, the card, or the video uses, one line each, in simple English, with one short example when it helps. Example:
- prices-pool: the name of a background job in Dawn. When a coin has no trades for 30 seconds, it asks Codex if the price of the coin is stuck.
