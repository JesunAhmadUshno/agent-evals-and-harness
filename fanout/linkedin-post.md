# LinkedIn post draft: P27 agent-evals-and-harness v1.0

Status: DRAFT NOT POSTED
Date drafted: 2026-11-05
Author: Jesun Ahmad Ushno
Rule for this platform: the link goes in the first comment, not in the
post body. The first comment line is at the end of this file.

## Post body

A pass rate alone does not tell you how an agent failed. So I built
the harness that names and counts the failure.

agent-evals-and-harness v1.0 is done: Learn, Build, and a compressed
Deep, all open, all measured, Python standard library only.

The scope, up front: the agent under test is a toy deterministic
agent, NOT an LLM. And held-out here means unseen during
development in this repo, NOT an external benchmark.

Learn: one toy agent on a fixed 12-task set with trajectory logs.
9 succeeded, 3 failed by design, success rate 0.75, and 12 of 12
outcomes matched the expected answer or failure label.

Build: 36 tasks (16 dev, 20 held-out, reported separately), 5
attempts per task under 5 master seeds, five toy component
ablation variants. Full variant: pass@1 0.9889, pass@3 1.000,
pass@5 1.000, mean success 0.980. Minimal variant, all components
off: mean 0.4089. Removing the planner costs the most. Removing
the verifier drops pass@1 to 0.85.

Deep (compressed): every failed attempt from 4,500 real runs of
the Build suite, classified into one primary class. 3,215 passed,
1,285 failed: truncated_plan 1,000 (77.82 percent),
silent_wrong_answer 185, tool_misuse 100. The hygiene report,
computed in code: 0 exact overlaps, 0 duplicates, 0 held-out
answers in the agent code, one near neighbour pair disclosed.

The honest limits, in the post and not in a footnote: toy agent
only, held-out is in-repo and same-author, slips are simulated
with seeded rates, and two taxonomy classes are zero by
construction because this toy cannot loop. 64 tests in total.
The rest of the Deep scope is the v1.1 backlog in the repo, not
claimed as done.

If you evaluate agents: which failure class costs you the most
time, truncated plans, silent wrong answers, or tool misuse?

## First comment (post this as the first comment, per the standing rule)

Repo, releases v0.1, v0.5, and v1.0, and the full tutorial: https://github.com/JesunAhmadUshno/agent-evals-and-harness
