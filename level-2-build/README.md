# Level 2, Build: agent-evals-and-harness

Status: DONE (2026-11-05). An eval suite with a public dev set and
a held-out task set, pass@k and variance over seeded repeated
trials, and a harness that runs a configurable toy agent in five
component ablation variants, built with the Python standard
library only.

## Main claim

On the Muse VM on 2026-11-05, the Build harness ran five toy
agent variants over 36 tasks (16 dev plus 20 held-out), 5 attempts
per task under each of 5 master seeds (11, 22, 33, 44, 55): the
full variant reached pass@1 0.9889, pass@3 1.0, and pass@5 1.0,
with mean attempt success 0.98, variance 0.0001, mean steps
1.8911, and mean cost 2.8933 units, while the minimal variant
(all components off) reached mean attempt success 0.4089, and the
full variant scored mean attempt success 0.9775 on the dev set
and 0.982 on the held-out set, reported separately.

## Honest scope line

The agent in this level is a configurable toy agent. It is not
an LLM, it is not a real agent, it calls no API, and it does not
learn. The ablations are toy component ablations (planner,
memory, verifier switches on the toy agent), NOT real model
ablations, and the table must never be read as a model ablation
table. The stochastic element is simulated: a seeded slip rate
per task difficulty, not sampling from any real model. Held-out
here means the 20 held-out tasks were unseen during agent
development in this repo; it is not a hidden external benchmark,
and the held-out tasks were authored in this repo by the same
author as the agent.

## BUILD-SPEC

1. Configurable toy agent (eval_suite.py): three named components
   that can be ablated. Planner: multi-step decomposition; when
   off, only the first step of a multi-step plan runs and its
   intermediate result becomes the answer. Memory: a lookup cache
   plus a recall store; when off, repeated lookups cost full
   price again and any step using a recall placeholder fails with
   memory_unavailable. Verifier: an answer self-check; when on,
   it catches a seeded slip with probability 0.85 and restores
   the uncorrupted answer at a cost of 2 units and 1 step.
2. Slip model: each attempt draws from random.Random seeded with
   master seed, variant name, task id, and attempt index. A slip
   occurs with probability 0.08 times task difficulty (difficulty
   1, 2, or 3) and corrupts the agent answer (numeric answers
   plus 1, string answers marked uncertain). Designed-failure
   tasks fail in the plan before any slip applies.
3. Task sets: (a) dev set, tasks_dev.json, 16 tasks in the Learn
   style extended with difficulty and memory categories; (b)
   held-out set, tasks_heldout.json, 20 new tasks authored for
   Build. The agent code contains no task-specific answers and
   never reads the task files or the expected fields; scoring
   keys (expected answers and failure labels) live only in the
   task files and are read only by the scorer. The sha256 hash
   of the held-out file is committed in the results (below) so
   later changes to the held-out set are detectable.
4. pass@k definition used: a task passes at k if any of its
   first k attempts passes. pass@k reported here is the mean
   over the 5 master seeds of the per-seed fraction of tasks
   passing at k, for k in 1, 3, 5, with 5 attempts per task.
5. Variance: per variant and per task set, the per-seed attempt
   success rate (passed attempts over all attempts in that seed)
   is computed for each of the 5 master seeds; the table reports
   its population mean, population variance, and standard
   deviation across those 5 seeds.
6. Harness (run_build.py): one command runs every variant times
   every seed on dev, held-out, and combined sets, and writes
   results_build.json deterministically. Run it twice: the file
   is identical (verified 2026-11-05, sha256
   8b8cdc22c66a4e33a6e51ee481709d57521e2b6efb821962e1317a0dacb75f94
   on both runs).
7. Scoring: a success task passes when the agent succeeds and
   its answer equals the expected answer. A designed-failure
   task passes when the agent fails with the expected failure
   label. This matches the Learn matches_expected rule.

## Run it

    python level-2-build/run_build.py
    python -m unittest tests.test_build_eval_suite -v

## Results (measured 2026-11-05, Muse VM, Python 3.12)

Ablation table, combined sets (36 tasks). These are TOY agent
component ablations, NOT real model ablations.

| Variant | Planner | Memory | Verifier | pass@1 | pass@3 | pass@5 | Mean success | Variance | Std | Mean steps | Mean cost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| full | on | on | on | 0.9889 | 1.0 | 1.0 | 0.98 | 0.0001 | 0.0075 | 1.8911 | 2.8933 |
| no_planner | off | on | on | 0.4389 | 0.4444 | 0.4444 | 0.4411 | 0.0 | 0.0044 | 1.1367 | 1.5511 |
| no_memory | on | off | on | 0.8667 | 0.8889 | 0.8889 | 0.8744 | 0.0001 | 0.009 | 1.8533 | 2.8733 |
| no_verifier | on | on | off | 0.85 | 0.9889 | 0.9944 | 0.8678 | 0.0004 | 0.0203 | 1.7778 | 2.6667 |
| minimal | off | off | off | 0.4111 | 0.4444 | 0.4444 | 0.4089 | 0.0001 | 0.009 | 1.0 | 1.2778 |

Std values are in results_build.json; the variance column above
is the rounded population variance across the 5 master seeds.

Per-set split (never merged silently). Mean success is the mean
attempt success rate; pass values are mean pass@k over seeds.

| Variant | Set | Tasks | pass@1 | pass@3 | pass@5 | Mean success | Variance |
| --- | --- | --- | --- | --- | --- | --- | --- |
| full | dev | 16 | 1.0 | 1.0 | 1.0 | 0.9775 | 0.0001 |
| full | held-out | 20 | 0.98 | 1.0 | 1.0 | 0.982 | 0.0001 |
| no_planner | dev | 16 | 0.4375 | 0.4375 | 0.4375 | 0.4375 | 0.0 |
| no_planner | held-out | 20 | 0.44 | 0.45 | 0.45 | 0.444 | 0.0001 |
| no_memory | dev | 16 | 0.875 | 0.875 | 0.875 | 0.87 | 0.0 |
| no_memory | held-out | 20 | 0.86 | 0.9 | 0.9 | 0.878 | 0.0001 |
| no_verifier | dev | 16 | 0.8375 | 1.0 | 1.0 | 0.8675 | 0.0014 |
| no_verifier | held-out | 20 | 0.86 | 0.98 | 0.99 | 0.868 | 0.0012 |
| minimal | dev | 16 | 0.3875 | 0.4375 | 0.4375 | 0.405 | 0.0005 |
| minimal | held-out | 20 | 0.43 | 0.45 | 0.45 | 0.412 | 0.0004 |

Held-out file: tasks_heldout.json, sha256
8b493427a00e893a642bc9318be889af22e690697b6e1ce9bf1a7de2781e0c4f.
Dev file: tasks_dev.json, sha256 recorded in results_build.json.

Reading the table: removing the planner is the largest success
loss (multi-step and memory tasks stop at step 1). Removing
memory fails every recall task deterministically and raises
repeated lookup cost. Removing the verifier leaves slips
uncorrected, which pass@3 and pass@5 mostly recover because a
later attempt may not slip, while pass@1 drops to 0.85. The
held-out split tracks the dev split closely for every variant;
no variant was tuned on the held-out set.

Tests: 24 new Build tests pass, plus 21 Learn tests and the
scaffold smoke test (45 unit tests total). The Build tests cover
pass@k arithmetic on hand-computed attempt matrices, variance
arithmetic, each ablation switch changing behaviour, the
held-out hash matching the file, the agent ignoring expected
fields and containing no task file reference, determinism with
the same seeds, and the dev and held-out split counts.

## Failure modes and limits

- Toy agent only: success differences come from three switches
  on a rule based toy. They say nothing about any real agent,
  any real model, or real ablation practice.
- Held-out is in-repo: the 20 held-out tasks were written by the
  same author as the agent and the evaluator, in the same style
  and categories as the dev set. There is no external task
  source and no third-party author, so generalisation claims
  stop at this repo.
- Simulated stochasticity: slips are drawn from a seeded model
  with invented rates (0.08 per difficulty level, verifier catch
  0.85). Real model sampling variance is not measured.
- Small sets: 16 dev and 20 held-out tasks. Pass@k differences
  of one task move a per-seed fraction by 0.05 or more.
- Cost is a unit count on a fixed price list (lookup 1, other
  tools 2, verifier 2, cache hit 0). It is not money, not
  tokens, and not a measured price for any real model or API.
- Designed failures are still simple: missing lookup keys and
  division by zero, plus memory_unavailable when memory is off.
  Real failure classes (tool misuse, loop traps, silent wrong
  answers as a taxonomy with counts) are Deep level scope.
- This level was run on the Muse VM (CPU), not on its fleet
  node BlackBoxV2. That costs a grade deduction, named below.

## Grade

Grade: 8,200 of 10,000 for this Build level.

Deductions (they sum to 1,800):
- Configurable toy agent, not an LLM or a real agent, and the
  ablations are component switches, not model ablations:
  minus 500.
- Held-out set authored in this repo by the same author as the
  agent, not an external or hidden benchmark: minus 400.
- Seeded stochasticity is simulated with invented slip and
  catch rates, not real model sampling: minus 300.
- Small task sets: 16 dev plus 20 held-out tasks: minus 250.
- Run on the Muse VM, not the assigned BlackBoxV2 fleet node:
  minus 200.
- Cost is a unit count on a fixed price list, not money or
  tokens: minus 150.

## What Deep adds next

A failure taxonomy (tool misuse, loop traps, silent wrong
answers) with counts from real runs, and a contamination
hygiene report, per the SPEC. See the root README level map.
