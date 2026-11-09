# Counting How an Agent Fails: An Eval Harness With a Failure Taxonomy

By Jesun Ahmad Ushno
Date: 2026-11-05
Status: DRAFT, written fan-out for P27 agent-evals-and-harness v1.0. Not posted.

## The problem

A single success rate hides how an agent failed. An agent that stops
after the first step of a plan, an agent that returns a wrong answer
with no error, and an agent that calls a tool it cannot use can all
land on the same score, and each one needs a different fix. Agent
evaluation needs the failure named and counted, not only the pass
rate reported.

This project, P27 in Roadmap v3, builds that discipline in three
levels: score one agent with trajectory logs, run repeated trials
with pass at k and component ablations, then classify every failed
attempt into one primary failure class and check the task sets for
contamination. All code is in the open, runs with the Python
standard library only, and needs no model, no API, and no
credential.

Repository: https://github.com/JesunAhmadUshno/agent-evals-and-harness

## Honest scope, stated first

The agent under test in every level is a toy deterministic agent.
It is NOT an LLM. It follows a written tool plan, it does not plan
or reason on its own, and it calls no API. No number in this post
describes a real model or a real agent.

Held-out in this project means unseen during development in this
repo. The 20 held-out tasks were authored in this repo by the same
author as the agent. Held-out here is NOT an external benchmark,
not a hidden third-party set, and not an independent test.

## Past, present, future (the dossier, condensed)

Past: agent benchmark suites in the Terminal-Bench class already
exist. The prior art and the history of the problem are recorded
in DOSSIER.md and NOVELTY.md in the repo. The novelty text there
stays marked PROPOSED. This post makes no novelty claim beyond
the measured work below.

Present: v1.0 closes three levels on 2026-11-05. Learn scored one
toy agent on a fixed task set with trajectory logs. Build ran an
eval suite with a dev set and a held-out set reported separately,
pass at k over seeded repeated trials, and five toy component
ablation variants. Compressed Deep classified every failed attempt
from real runs of the Build suite into a six-class taxonomy and
computed a contamination hygiene report in code.

Future: the rest of the v2 Deep scope is named in ROADMAP.md in
the repo as the v1.1 backlog. It includes a real LLM-backed agent
under test, a loop-capable agent, richer tool misuse families,
external held-out tasks, contamination checks against a named
external corpus, a human adjudication sample, and real token and
money cost accounting. None of that is done, and none of it is
claimed here.

## Main results claim

At v1.0, measured on the Muse VM on 2026-11-05 with a toy deterministic agent (not an LLM): Learn scored 12 tasks with 9 succeeded and 3 failed by design, success rate 0.75, and 12 of 12 outcomes matched the expected answer or failure label; Build ran 36 tasks combined (16 dev plus 20 held-out, held-out meaning unseen during development in this repo, not an external benchmark) with the full variant at pass@1 0.9889, pass@3 1.000, pass@5 1.000, and mean attempt success 0.980, against no_planner 0.4411, no_memory 0.8744, no_verifier 0.8678, and minimal 0.4089; Deep re-ran the Build suite for 4,500 attempts with 3,215 passed and 1,285 failed, classified as truncated_plan 1,000 (77.82 percent of failures), silent_wrong_answer 185, and tool_misuse 100, with 64 unit tests in total.

Every number in that claim comes from a run recorded in the level
READMEs and the three results files in the repo. Read the limits
section below before quoting any of it.

## Results by level

### Level 1, Learn (release v0.1)

The Learn set holds 12 tasks: 3 arithmetic, 3 lookup, 3
multi-step, and 3 designed-failure tasks. The evaluator records
success rate, steps, cost per task, and a full trajectory log for
every task.

| Measure | Result |
| --- | --- |
| Tasks | 12 |
| Succeeded / failed | 9 / 3 (all 3 failures by design) |
| Success rate | 0.75 |
| Matches expected | 12 of 12, match rate 1.0 |
| Total steps / mean steps | 18 / 1.5 |
| Total cost units / mean cost | 27 / 2.25 (units, not money or tokens) |
| Trajectory entries | 18 |
| Tests | 21, plus the scaffold smoke test |

### Level 2, Build (release v0.5)

The Build suite runs five configurable toy agent variants over
16 dev tasks plus 20 held-out tasks, 5 attempts per task under
each of 5 master seeds (11, 22, 33, 44, 55). Held-out results are
reported separately and never merged silently. The ablations are
toy component ablations (planner, memory, verifier switches), NOT
model ablations.

| Variant (combined, 36 tasks) | pass@1 | pass@3 | pass@5 | Mean success |
| --- | --- | --- | --- | --- |
| full | 0.9889 | 1.000 | 1.000 | 0.980 |
| no_planner | 0.4389 | 0.4444 | 0.4444 | 0.4411 |
| no_memory | 0.8667 | 0.8889 | 0.8889 | 0.8744 |
| no_verifier | 0.8500 | 0.9889 | 0.9944 | 0.8678 |
| minimal | 0.4111 | 0.4444 | 0.4444 | 0.4089 |

For the full variant, mean attempt success was 0.9775 on the dev
set and 0.982 on the held-out set. Removing the planner is the
largest loss, because multi-step tasks stop at step 1. Removing
the verifier drops pass@1 to 0.85, while pass@3 and pass@5 mostly
recover, because a later attempt may not slip.

Tests at this level: 24 new tests, 45 unit
tests in total with Learn.

### Level 3, Deep, compressed (release v1.0)

The Deep runner re-ran the Build suite attempt by attempt and
classified every failed attempt into exactly one primary class.
The counts sum to the failure total by construction of the check,
and the test suite asserts that sum.

| Primary class | Count | Share of 1,285 failures |
| --- | --- | --- |
| truncated_plan | 1,000 | 77.82 percent |
| silent_wrong_answer | 185 | 14.40 percent |
| tool_misuse | 100 | 7.78 percent |
| loop_trap | 0 | 0.00 percent |
| excess_steps | 0 | 0.00 percent |
| other_wrong_answer | 0 | 0.00 percent |
| Total failures | 1,285 of 4,500 attempts | 100.00 percent |

Passed attempts: 3,215 of 4,500.

The hygiene report, computed in code, compared 320 cross-set
pairs and found 0 exact fingerprint overlaps, 0 exact plan
overlaps, 0 duplicates across all 36 task texts, and 0 held-out
answers in the toy agent code. One near neighbour pair is
disclosed, not hidden: D16 and H20 at Jaccard 0.8, below the 0.9
near-duplicate threshold. The behavioural mutation check held at
20 of 20 runs unchanged.

Tests at this level: 19 new tests, 64 unit
tests in total, plus the scaffold smoke test.

## Honest limits

- Toy agent only. The agent is a toy deterministic agent, NOT an
  LLM. Its scores say nothing about any real agent or model.
- Held-out is in-repo. Held-out means unseen during development
  in this repo, NOT an external benchmark. The held-out tasks
  share an author, a style, and categories with the dev set.
- Simulated stochasticity. Build slips are drawn from a seeded
  model with invented rates (0.08 per difficulty level, verifier
  catch 0.85). Real model sampling variance is not measured.
- Two taxonomy classes are zero by construction. The toy agent
  cannot loop or exceed its step bound, so loop_trap and
  excess_steps cannot fire in this toy. Their detectors ran; the
  counts are weak evidence, named as such in the Deep README.
- truncated_plan dominates by design. The planner ablation is
  deterministic: every planner-off multi-step attempt fails, so
  the 77.82 percent share describes the ablation design as much
  as the agent.
- Cost is a unit count on a fixed price list. It is not money,
  not tokens, and not a price for any real model or API.
- Attempts are reruns. The 4,500 Deep attempts are seeded reruns
  of the same 36 tasks, not 4,500 distinct tasks.
- All levels ran on the Muse VM, not the assigned fleet node
  BlackBoxV2. That limit is named in each level write-up.

## Why this matters for real eval work

The transferable part is the discipline, not the toy scores:
report dev and held-out separately, define pass at k before you
run, ablate one component at a time, classify every failure into
one primary class so counts sum to the total, and compute the
hygiene checks in code instead of asserting them. That discipline
is what the v1.1 backlog carries to a real LLM-backed agent.

## Links

- Repo: https://github.com/JesunAhmadUshno/agent-evals-and-harness
- Release v0.1: https://github.com/JesunAhmadUshno/agent-evals-and-harness/releases/tag/v0.1
- Release v0.5: https://github.com/JesunAhmadUshno/agent-evals-and-harness/releases/tag/v0.5
- Release v1.0: https://github.com/JesunAhmadUshno/agent-evals-and-harness/releases/tag/v1.0
- Tutorial: fanout/tutorial.md in the repo
