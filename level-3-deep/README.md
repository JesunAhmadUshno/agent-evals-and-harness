# Level 3, Deep: agent-evals-and-harness

Status: DONE (2026-11-05, compressed Deep). A failure taxonomy
with counts from real runs of the Build eval suite, plus a
contamination hygiene report computed in code, built with the
Python standard library only. The full spec for this level is
in DEEP-SPEC.md in this folder.

## Main claim

On the Muse VM on 2026-11-05, the Deep runner re-ran the Build
eval suite attempt by attempt (five toy agent variants, five
master seeds 11, 22, 33, 44, 55, 36 tasks, 5 attempts per task:
4,500 attempts) and classified every one of the 1,285 failed
attempts into exactly one primary taxonomy class: truncated_plan
1,000, silent_wrong_answer 185, tool_misuse 100, loop_trap 0,
excess_steps 0, other_wrong_answer 0, and the counts sum to the
failure total (1,000 + 185 + 100 + 0 + 0 + 0 = 1,285). The
hygiene report found 0 exact overlaps, 0 duplicates, and 0
held-out answers in the toy agent code across all its checks,
with one near neighbour pair disclosed (D16 and H20, Jaccard
0.8, below the 0.9 near-duplicate threshold).

## Honest scope line

The agent in this level is a toy agent. It is not an LLM, it is
not a real agent, it calls no API, and it does not learn. The
taxonomy describes this toy agent only. No claim is made about
real agent quality, real model behaviour, or any external
benchmark. The stochastic element is the Build suite's seeded
slip model, not sampling from any real model.

## Method

1. Real runs, imported code. deep_analysis.py inserts
   level-2-build on the import path and imports eval_suite
   (ConfigurableToyAgent, score_attempt, VARIANTS, MASTER_SEEDS).
   It reconstructs each attempt with the same per-attempt seed
   string the Build suite uses (master seed, variant, task id,
   attempt index), so the attempt stream is the Build stream,
   not a new simulation.
2. Failure. An attempt fails when score_attempt returns False:
   a success task whose answer differs, or a designed-failure
   task whose failure label differs or which did not fail.
   Totals: 4,500 attempts, 3,215 passed, 1,285 failed.
3. Taxonomy. Each failed attempt is classified by the first
   matching operational rule, in this precedence order:
   loop_trap, excess_steps, truncated_plan, tool_misuse,
   silent_wrong_answer, other_wrong_answer. Definitions are in
   DEEP-SPEC.md. Rules read the run record and the trajectory
   log; they do not read the expected answer.
4. Hygiene. hygiene_report in deep_analysis.py computes every
   check in the table below in code: set overlap, duplication,
   agent-code scanning scoped to the ConfigurableToyAgent class
   segment, a behavioural mutation check, and file hash checks
   against the Build record.
5. Determinism. run_deep.py writes results_deep.json with no
   timestamps. Run it twice: the file is identical (verified
   2026-11-05, sha256
   4afb62c2b34a0a3275a3be67e80ea421ae86d11144882a4c03680daec88d4415
   on both runs).

## Run it

    python level-3-deep/run_deep.py
    python -m unittest tests.test_deep_taxonomy_hygiene -v

## Results: failure taxonomy (measured 2026-11-05, Muse VM, Python 3.12)

| Primary class | Count | Share of 1,285 failures | Operational signal |
| --- | --- | --- | --- |
| truncated_plan | 1,000 | 77.82 percent | planner off and plan length over 1 |
| silent_wrong_answer | 185 | 14.40 percent | outcome success, slip true, slip_caught false |
| tool_misuse | 100 | 7.78 percent | outcome failure with a tool failure label |
| loop_trap | 0 | 0.00 percent | same non-verifier call 3 or more times in one trajectory |
| excess_steps | 0 | 0.00 percent | steps over plan length plus 1 |
| other_wrong_answer | 0 | 0.00 percent | fallback, no rule above matched |
| total | 1,285 | 100.00 percent | counts sum to the failure total |

Hand checks, computed independently of the classifier:
truncated_plan: 20 of the 36 tasks have a plan longer than 1
step (9 dev plus 11 held-out), 2 variants have the planner off
(no_planner, minimal), and each variant runs 25 attempts per
task (5 seeds times 5 attempts): 20 times 2 times 25 = 1,000.
Every such attempt failed, because an intermediate result never
equals the expected final answer or the expected failure.
tool_misuse: 4 tasks use a recall step (D09, D10, H11, H12), and
only the no_memory variant (planner on, memory off) reaches the
recall step and fails there: 4 times 25 = 100, all with the
label memory_unavailable. In the minimal variant the same tasks
are truncated first, so they count as truncated_plan by the
precedence order. silent_wrong_answer by variant (full 18,
no_planner 3, no_memory 13, no_verifier 119, minimal 32) sums
to 185: 18 + 3 + 13 + 119 + 32 = 185.

By variant (failed attempts of 900 attempts per variant):

| Variant | loop_trap | excess_steps | truncated_plan | tool_misuse | silent_wrong_answer | other | Failed total |
| --- | --- | --- | --- | --- | --- | --- | --- |
| full | 0 | 0 | 0 | 0 | 18 | 0 | 18 |
| no_planner | 0 | 0 | 500 | 0 | 3 | 0 | 503 |
| no_memory | 0 | 0 | 0 | 100 | 13 | 0 | 113 |
| no_verifier | 0 | 0 | 0 | 0 | 119 | 0 | 119 |
| minimal | 0 | 0 | 500 | 0 | 32 | 0 | 532 |
| total | 0 | 0 | 1,000 | 100 | 185 | 0 | 1,285 |

By task set: dev failed 577 of 2,250 attempts (truncated_plan
450, tool_misuse 50, silent_wrong_answer 77, all other classes
0); held-out failed 708 of 2,250 attempts (truncated_plan 550,
tool_misuse 50, silent_wrong_answer 108, all other classes 0).

## Results: contamination hygiene (computed in code, 2026-11-05)

| Check | Result |
| --- | --- |
| Cross-set pairs compared (16 dev times 20 held-out) | 320 |
| Task id overlap between dev and held-out | 0 |
| Exact fingerprint overlap (category, plan, expected outcome, answer, failure label) | 0 |
| Exact plan overlap | 0 |
| Near duplicate pairs at or above Jaccard 0.9 (fingerprint tokens) | 0 |
| Near neighbour pairs at or above Jaccard 0.8 | 1 |
| Maximum cross-set Jaccard | 0.8, pair D16 and H20 |
| Duplicate ids inside dev / inside held-out | 0 / 0 |
| Duplicate fingerprints inside dev / inside held-out | 0 / 0 |
| Duplicate full task texts across all 36 tasks | 0 |
| Cross-set duplicates ignoring the id field | 0 |
| Toy agent class segment: banned strings (expected_answer, expected_failure_label, tasks_dev, tasks_heldout) | 0 of each, 0 total |
| Toy agent class segment: held-out task id strings | 0 total |
| Behavioural check: held-out runs unchanged when scoring keys are mutated | 20 of 20 |
| Held-out file sha256 matches the Build record | yes, 8b493427a00e893a642bc9318be889af22e690697b6e1ce9bf1a7de2781e0c4f |
| Dev file sha256 matches the Build record | yes, ab08f50738a7890b873071a8e4e7dafe6f7e21d2c93e15572c3896a98ccdf30b |
| Shared distinct expected_answer values across sets (informational) | 2 (42 and null) |

The near neighbour is disclosed, not hidden: D16 and H20 are
the same designed-failure template (lookup inventory_count,
then divide a literal by the result) with a different literal
divisor (100 in D16, 55 in H20) and different ids. They are not
exact duplicates on any check above, and the 0.8 similarity is
below the 0.9 near-duplicate threshold defined in DEEP-SPEC.md,
but a reader should know the held-out set reuses this template.
The shared answer values are also not contamination: 42 is a
small integer two unrelated arithmetic tasks reach, and null is
the answer field of every designed-failure task.

Tests: 19 new Deep tests pass, plus 21 Learn tests, 24 Build
tests (64 unit tests total), and the scaffold smoke test. The
Deep tests cover each classifier rule on hand-built runs, the
precedence order, the attempt arithmetic (5 times 5 times 36
times 5 = 4,500), the taxonomy sum, the locked measured counts,
every hygiene check, and results_deep.json matching a fresh
full_report run.

## Failure modes and limits

- Toy agent only: the taxonomy is a taxonomy of three component
  switches and a seeded slip model on a toy agent. It says
  nothing about failure classes of real agents or real models.
- Two classes are structurally near-unreachable in this toy:
  the toy agent has no retry or replanning loop, so no
  trajectory can repeat a call 3 times, and its step count is
  bounded by the plan length plus one verifier step, so
  excess_steps cannot fire either. loop_trap 0 and
  excess_steps 0 are therefore weak evidence: the detectors ran
  on 1,285 failures, but this toy cannot produce those failures
  by construction. A real loop trap count needs an agent that
  can actually loop, which is v1.1 scope.
- truncated_plan dominates because the planner ablation is
  deterministic, not sampled: every planner-off multi-step
  attempt fails. The 77.82 percent share describes the ablation
  design as much as the toy agent.
- tool_misuse is narrow: one label only (memory_unavailable),
  from one mechanism (recall with memory off). Real tool misuse
  (wrong tool, wrong arguments, untrusted tool output) is not
  exercised by this toy agent at all.
- silent_wrong_answer counts rest on invented slip rates (0.08
  per difficulty level, verifier catch 0.85, from Build). The
  relative pattern (no_verifier 119 of 185) follows from those
  constants, not from measured model behaviour.
- Held-out is still in-repo and same-author, and one held-out
  task (H20) reuses a dev template at Jaccard 0.8. Hygiene here
  proves no exact leakage inside this repo; it does not prove
  independence from the task author, and there is no external
  corpus to check contamination against.
- Attempts are reruns: 4,500 attempts are seeded reruns of the
  same 36 tasks, not 4,500 distinct tasks.
- This level was run on the Muse VM (CPU), not on its fleet
  node BlackBoxV2. That costs a grade deduction, named below.

## Grade

Grade: 7,750 of 10,000 for this Deep level (compressed Deep).

Deductions (they sum to 2,250):
- Toy agent, not an LLM or a real agent, and the taxonomy
  classes describe component switches on that toy: minus 500.
- loop_trap and excess_steps are structurally unreachable in
  this toy agent, so 2 of the 6 classes are detectors with a
  zero count rather than measured failure classes: minus 600.
- Seeded stochasticity is simulated with invented slip and
  catch rates, not real model sampling: minus 300.
- Held-out set authored in this repo by the same author as the
  toy agent, with one near neighbour pair at Jaccard 0.8
  sharing a dev template: minus 400.
- Small task base: 36 tasks, and the 4,500 attempts are seeded
  reruns of those same 36 tasks: minus 250.
- Run on the Muse VM, not the assigned BlackBoxV2 fleet node:
  minus 200.
