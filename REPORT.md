# Report: agent-evals-and-harness (P27)

Status: FUNCTIONAL, not pre-registered (2026-11-08). The harness has
run end to end on a deterministic toy agent (not an LLM) and every
number below is regenerated from the committed task files by the
runners, checked in CI. No hypothesis was locked before the runs, so
nothing here is a confirmed finding; the confirmatory re-run is drafted
in PROPOSAL.md and waits on the Owner.

## Results at a glance

Every number is read from a committed results file, named in the last
column. Uncertainty: the Build and Deep runs use 5 master seeds (11,
22, 33, 44, 55) times 5 attempts per task; the Python record reports
the population standard deviation of the per-seed attempt success rate
across those 5 seeds. It has no interval over tasks (see Review,
section 5).

| Result | Value | Evidence |
| --- | --- | --- |
| Learn: toy agent on 12 fixed tasks | 9 succeeded, 3 failed by design, 12 of 12 matched expected | level-1-learn/results_learn.json |
| Build: full variant mean attempt success (36 tasks) | 0.98, seed SD 0.0075 | level-2-build/results_build.json, ablation_table |
| Build: planner removed (no_planner) | 0.4411, seed SD 0.0044 | same |
| Build: all components off (minimal) | 0.4089, seed SD 0.009 | same |
| Build: full variant dev vs held-out | 0.9775 vs 0.982 | same, variants.full.dev / .heldout |
| Deep: failed attempts classified | 1,285 of 4,500 into six classes; truncated_plan 1,000, silent_wrong_answer 185, tool_misuse 100, loop_trap 0, excess_steps 0, other 0 | level-3-deep/results_deep.json |
| Deep: hygiene | 0 exact overlaps, 0 duplicates, 0 held-out answers in agent code, 1 near neighbour (D16, H20 at Jaccard 0.8) | same, hygiene |
| Hygiene threshold sweep | 0 near duplicates for any threshold of 0.85 or more | level-3-deep/results_hygiene_sensitivity.json |

## Hypotheses

None was written down before the runs (PROPOSAL.md), so none can be
scored as confirmed or refuted. What the runs show, stated as
observations:

| Observation | Status | Why it is not a finding |
| --- | --- | --- |
| Removing the planner is the largest success loss (0.98 to 0.4411) | Observed | Fixed by construction: every planner-off multi-step attempt is truncated (20 tasks x 2 variants x 25 attempts = 1,000) |
| Removing the verifier lowers pass@1 (0.9889 to 0.85) but pass@5 mostly recovers (0.9944) | Observed | Follows from two invented constants (slip 0.08 x difficulty, catch 0.85) |
| Held-out tracks dev for every variant | Observed | Held-out set is same-author and in-repo |
| loop_trap and excess_steps count 0 | Observed | Unreachable by construction in this toy; a miss of the taxonomy as a measurement, not evidence of absence |

## Background

Updated to ship state at v1.0, 2026-11-05. Written under the
documentation and publishing standard (past, present, future).

### Past

Prior art for this project is named in PROPOSAL.md, Proposed novelty (agent benchmark suites (Terminal-Bench class reports)). The history of the problem, the key papers and systems, and what was tried before are recorded in the Roadmap v2 section text in PROPOSAL.md, Original scope.

### Present

Shipped at v1.0 (2026-11-05), all three levels done:

- Learn (DONE): one deterministic toy
  agent (not an LLM) scored on a fixed 12-task set: success
  rate, steps, cost per task, with trajectory logs.
- Build (DONE): an eval suite with a
  16-task dev set and a 20-task held-out set reported
  separately, pass@k and variance over 5 master seeds, and a
  harness over five toy component ablation variants (planner,
  memory, verifier). These are toy component ablations, not
  model ablations. Full variant: pass@1 0.9889, mean attempt
  success 0.98; minimal variant: mean attempt success 0.4089.
- Deep, compressed (DONE): a failure
  taxonomy from real runs of the Build suite (4,500 attempts,
  1,285 failures: truncated_plan 1,000, silent_wrong_answer 185,
  tool_misuse 100, loop_trap 0, excess_steps 0,
  other_wrong_answer 0, counts sum to the failure total), plus
  a contamination hygiene report computed in code (320 cross-set
  pairs, 0 exact overlaps, 0 duplicates, 0 held-out answers in
  the toy agent code, behavioural mutation check 20 of 20, one
  near neighbour pair D16 and H20 at Jaccard 0.8 disclosed).
  Named limits: the toy agent cannot loop or exceed its step
  bound, so two classes are zero by construction; the held-out
  set is in-repo and same-author; slip rates are simulated.
  Full record: the Deep section below.

Tooling and versions, pinned at build time: Python 3.12,
standard library only, no external packages, no API calls.
Total unit tests at v1.0: 64, plus the scaffold smoke test.
All levels were run on the Muse VM, not the assigned fleet
node BlackBoxV2; that limit is named in each level section.

Current demand evidence: hiring value scored in the fleet pass (new candidates P23 to P29: see the decision pack Sections 4 and 5) [confirmed, fleet and scoring pass 2026-11-04; for P23 to P29, the decision pack 2026-11-04]. The Round 3 research (2026-11-04) found the market centre at post-training, evals, environments, and inference depth [confirmed as the research finding; the report is at ~/workspace/research_notes/roadmap-v3-revaluation-research-20261104-0949/report.md].

### Future

The v1.1 backlog is under Future work below: a real LLM-backed agent
under test, a loop-capable agent so loop_trap and excess_steps
become reachable, richer tool misuse families, external
held-out tasks, contamination checks against a named external
corpus, a human adjudication sample, real token and money cost
accounting, a larger task base, and a fleet rerun on BlackBoxV2.
Any forecast about this field is [unverified] unless a dated
primary source is added here.

## Baseline: Learn (one agent, fixed task set, trajectory logs)

Status: DONE (2026-11-05). An evaluator that scores one agent on a
fixed task set: success rate, steps, cost per task, with trajectory
logs, built with the Python standard library only.

Note: this project is agent evaluation. It is distinct from P06
rag-eval-harness, which evaluates retrieval and answers for RAG.
Here the unit under test is an agent trajectory: the ordered tool
calls an agent makes on a task.

### Honest scope line

The agent in this level is a deterministic toy agent. It is not
an LLM, it is not a real agent, it calls no API, and it does not
learn. It follows the tool plan written in each task, resolving
placeholders that refer to earlier tool results. No claim is made
about real agent quality, real model behaviour, or any external
benchmark. Real models and a held-out set are Build level scope.

### Method

1. Task set. A fixed labelled set of 12 tasks in tasks_learn.json,
   in four categories: arithmetic, lookup, multi-step tool use,
   and designed-failure. Each task has an id, a category, a tool
   plan, an expected outcome (success or failure), and either an
   expected answer or an expected failure label.
2. Tools. Four tools with fixed unit costs, computed in code:
   lookup costs 1 unit, add, multiply, and divide each cost 2
   units. A lookup reads a small fixed knowledge base in the code.
3. Agent run. The toy agent executes the plan step by step.
   The placeholder @prev means the previous tool result, and
   @stepN means the result of step N. Each call is recorded.
4. Trajectory log. Every task record in the results carries its
   full trajectory: ordered entries with step number, tool name,
   resolved arguments, result or error, failure label, and cost.
5. Scoring. A success task matches when the agent succeeds and
   its answer equals the expected answer. A failure task matches
   when the agent fails and its failure label equals the expected
   failure label. The evaluator reports success rate overall and
   per category, steps per task, cost per task, and match rate.
6. Validation. Duplicate ids, unknown categories, unknown tools,
   success tasks without an expected answer, and failure tasks
   without an expected failure label raise a named EvalError.

### The scenario

The 9 non-failure tasks succeed: 3 arithmetic, 3 lookup, and 3
multi-step tasks that chain lookup results into arithmetic. The
3 designed-failure tasks fail by design: F01 looks up a key that
does not exist (failure label missing_knowledge), F02 divides by
zero directly, and F03 divides by a zero value returned by a
lookup (both failure label division_by_zero). The evaluator is
expected to catch all three as failures, not as successes.

### Run it

    python level-1-learn/run_learn.py
    python -m unittest tests.test_learn_agent_eval -v
    python tests/test_smoke.py

The runner writes level-1-learn/results_learn.json deterministically:
run it twice and the file is identical (verified 2026-11-05:
sha256 941305d2dcdeb53c5c74a89814448b71206d66c62ed7340ee1ee007a1cbf6d2b
on both runs).

### Results (measured 2026-11-05, Muse VM, Python 3.12)

| Task | Category | Expected | Agent outcome | Answer | Steps | Cost | Match | Failure label |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A01 | arithmetic | success, 42 | success | 42 | 1 | 2 | yes | none |
| A02 | arithmetic | success, 42 | success | 42 | 1 | 2 | yes | none |
| A03 | arithmetic | success, 35 | success | 35 | 2 | 4 | yes | none |
| L01 | lookup | success, Ottawa | success | Ottawa | 1 | 1 | yes | none |
| L02 | lookup | success, Paris | success | Paris | 1 | 1 | yes | none |
| L03 | lookup | success, 100 | success | 100 | 1 | 1 | yes | none |
| M01 | multi-step | success, 12 | success | 12 | 2 | 3 | yes | none |
| M02 | multi-step | success, 25 | success | 25 | 3 | 4 | yes | none |
| M03 | multi-step | success, 25 | success | 25 | 2 | 3 | yes | none |
| F01 | designed-failure | failure | failure | none | 1 | 1 | yes | missing_knowledge |
| F02 | designed-failure | failure | failure | none | 1 | 2 | yes | division_by_zero |
| F03 | designed-failure | failure | failure | none | 2 | 3 | yes | division_by_zero |

Per category:

| Category | Tasks | Succeeded | Success rate | Total steps | Mean steps | Total cost | Mean cost |
| --- | --- | --- | --- | --- | --- | --- | --- |
| arithmetic | 3 | 3 | 1.0 | 4 | 1.3333 | 8 | 2.6667 |
| lookup | 3 | 3 | 1.0 | 3 | 1.0 | 3 | 1.0 |
| multi-step | 3 | 3 | 1.0 | 7 | 2.3333 | 10 | 3.3333 |
| designed-failure | 3 | 0 | 0.0 | 4 | 1.3333 | 6 | 2.0 |
| total | 12 | 9 | 0.75 | 18 | 1.5 | 27 | 2.25 |

Summary: Learn scored one deterministic toy agent (not an LLM) on a fixed 12-task set on the Muse VM: 9 tasks succeeded and 3 failed by design, success rate 0.75, all 12 outcomes matched their expected answer or failure label, 18 total steps at mean 1.5 per task, 27 total cost units at mean 2.25 per task, and 18 trajectory entries, with 21 unit tests passing plus the scaffold smoke test.

Hand checks: success rate is 9 / 12 = 0.75. Steps are arithmetic
1 + 1 + 2 = 4, lookup 1 + 1 + 1 = 3, multi-step 2 + 3 + 2 = 7,
designed-failure 1 + 1 + 2 = 4, total 18, mean 18 / 12 = 1.5.
Cost is arithmetic 2 + 2 + 4 = 8, lookup 1 + 1 + 1 = 3,
multi-step 3 + 4 + 3 = 10, designed-failure 1 + 2 + 3 = 6,
total 27, mean 27 / 12 = 2.25. Arithmetic means on that small
subset by hand: mean steps (1 + 1 + 2) / 3 = 1.3333, mean cost
(2 + 2 + 4) / 3 = 2.6667. Trajectory entries equal total steps,
18, because every step is one tool call and every call is logged,
including the failing calls in F01, F02, and F03.

### Failure modes and limits

- Toy agent only: the agent follows a written plan. It does not
  plan, reason, or choose tools, so its success rate says nothing
  about any real agent or model.
- Small synthetic task set, same author: 12 tasks written by the
  same author as the evaluator. No held-out set, no external
  tasks, and no contamination check exist at this level.
- Designed failures are simple: a missing lookup key and division
  by zero. Real failure classes such as tool misuse, loop traps,
  and silent wrong answers are Deep level scope, not measured here.
- No variance: the agent is deterministic, so every run is the
  same. Pass at k, sampling variance, and repeated trial scores
  do not exist here and are Build level scope.
- Cost is a unit count on a fixed price list (lookup 1, other
  tools 2), computed in code. It is not money, not tokens, and
  not a measured price for any real model or API.
- One run configuration only: one agent, one task set, one cost
  table. No ablation or comparison between agents is measured.
- This level was run on the Muse VM (CPU), not on its fleet node
  BlackBoxV2. That is a named limit.

## Build: eval suite, held-out set, pass@k, component ablations

Status: DONE (2026-11-05). An eval suite with a public dev set and
a held-out task set, pass@k and variance over seeded repeated
trials, and a harness that runs a configurable toy agent in five
component ablation variants, built with the Python standard
library only.

### Main claim

On the Muse VM on 2026-11-05, the Build harness ran five toy
agent variants over 36 tasks (16 dev plus 20 held-out), 5 attempts
per task under each of 5 master seeds (11, 22, 33, 44, 55): the
full variant reached pass@1 0.9889, pass@3 1.0, and pass@5 1.0,
with mean attempt success 0.98, variance 0.0001, mean steps
1.8911, and mean cost 2.8933 units, while the minimal variant
(all components off) reached mean attempt success 0.4089, and the
full variant scored mean attempt success 0.9775 on the dev set
and 0.982 on the held-out set, reported separately.

### Honest scope line

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

### BUILD-SPEC

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

### Run it

    python level-2-build/run_build.py
    python -m unittest tests.test_build_eval_suite -v

### Results (measured 2026-11-05, Muse VM, Python 3.12)

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

### Failure modes and limits

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
  node BlackBoxV2. That is a named limit.

## Deep: failure taxonomy and contamination hygiene

Status: DONE (2026-11-05, compressed Deep). A failure taxonomy
with counts from real runs of the Build eval suite, plus a
contamination hygiene report computed in code, built with the
Python standard library only. The full spec for this level is
in PROPOSAL.md, Deep spec.

### Main claim

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

### Honest scope line

The agent in this level is a toy agent. It is not an LLM, it is
not a real agent, it calls no API, and it does not learn. The
taxonomy describes this toy agent only. No claim is made about
real agent quality, real model behaviour, or any external
benchmark. The stochastic element is the Build suite's seeded
slip model, not sampling from any real model.

### Method

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
   PROPOSAL.md (Deep spec). Rules read the run record and the trajectory
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

### Run it

    python level-3-deep/run_deep.py
    python -m unittest tests.test_deep_taxonomy_hygiene -v

### Results: failure taxonomy (measured 2026-11-05, Muse VM, Python 3.12)

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

### Results: contamination hygiene (computed in code, 2026-11-05)

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
below the 0.9 near-duplicate threshold defined in PROPOSAL.md (Deep spec),
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

### Failure modes and limits

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
  node BlackBoxV2. That is a named limit.

## Review (research review, 2026-11-07)

A doctoral-style review of the three levels (Learn, Build, Deep) as a piece of research. Each criterion gets the evidence for it, what was fixed in the `site/live-dashboard` change, and, for every gap that remains, the exact compute or data needed to close it.

Every number below is read from a committed file named next to it. Numbers the dashboard adds (unbiased pass@k, bootstrap intervals) are computed in the browser by `site/src/engine.js` and are labelled there as not part of the repo record.

### Summary

| Criterion | One line |
|---|---|
| Research question | Clear engineering question (how do you evaluate an agent harness), but answered on a toy agent only. |
| Hypotheses | No pre-stated hypotheses; ablation effects are fixed by construction. |
| Method | Clean, deterministic harness with dev and held-out sets kept apart. |
| Baselines | Five ablation variants, including an all-off `minimal` baseline; three on/off combinations never run in Python. |
| Statistics and uncertainty | Repo reports only population variance over 5 seeds; the dashboard now adds task-level bootstrap intervals and a paired test, labelled as added. |
| Reproducibility | Deterministic runners, recorded sha256 values, CI diff against committed results, and an independent second-language replay. |
| Threats to validity | Stated honestly in the READMEs; now shown next to every chart. |
| Related work | No citations in the original scope or background; the proposed novelty is a draft with "NO MEASUREMENT YET". |
| Limitations | Limits are explicit and specific. |

### 1. Research question

The question is how to build an evaluation harness for agents: trajectory logging, a held-out set, pass@k with variance, component ablations, a failure taxonomy and contamination hygiene. It is well scoped as an engineering exercise. As a research question about agents it cannot be answered here, because the agent under test is a rule-following toy, not an LLM (stated in README.md and every level README).

**Remaining gap.** Run the same harness on a real agent. Needs: one LLM-backed agent (a local open-weights model on the fleet node, about 36 tasks x 5 seeds x 5 attempts = 900 runs per variant, 4,500 for five variants), plus the v1.1 "A real agent under test" item under Future work.

### 2. Hypotheses

No hypothesis is written down before the runs. The ablation outcomes are fixed by how the toy is built: `truncated_plan` = 20 multi-step tasks x 2 planner-off variants x 25 attempts = 1,000 (Deep section hand check, reproduced by `engine.check.mjs`), and the verifier gap follows from two invented constants (slip 0.08 x difficulty, catch probability 0.85, level-2-build/eval_suite.py). The ablation therefore measures the simulator's parameters, not a discovery.

**Fixed now.** The dashboard's what-if sliders re-run the seeded engine under other slip and catch constants and under the three combinations the repo never ran, labelled "not in the repo record", so the dependence on invented constants is visible rather than only stated.

**Remaining gap.** Pre-register hypotheses (direction and minimum effect) before the real-agent run in section 1. Needs no compute, only a dated file committed before that run.

### 3. Method

Strong for a toy: 16 dev and 20 held-out tasks reported separately, 5 master seeds x 5 attempts, seed strings of the form `seed:variant:task:attempt`, a fixed-precedence classifier giving each failure exactly one class, and hygiene checks computed in code (level-3-deep/deep_analysis.py).

Weaknesses: 2 of 6 taxonomy classes (`loop_trap`, `excess_steps`) are unreachable by construction; `tool_misuse` comes from one mechanism; cost is abstract units on an invented price list.

**Remaining gap.** Human adjudication sample of failed attempts with an agreement rate. Needs: a real-agent run (section 1) and about 100 failed trajectories labelled by two people.

### 4. Baselines

Five variants (`full`, `no_planner`, `no_memory`, `no_verifier`, `minimal`) in results_build.json `ablation_table`. Mean attempt success there: full 0.98, no_planner 0.4411, no_memory 0.8744, no_verifier 0.8678, minimal 0.4089. The three single-component variants (planner only, memory only, verifier only) were never run in Python.

**Fixed now.** The dashboard runs all eight on/off combinations live and marks the three unrecorded ones in amber.

**Remaining gap.** Add the three combinations to `eval_suite.py` so they enter the record. Needs: seconds of CPU and a re-run of `run_build.py` (which changes the recorded sha256, so the README values must be updated together).

### 5. Statistics and uncertainty

The repo reports the population variance of 5 per-seed success rates, rounded to 4 places (several cells read 0 or 0.0001). That ignores task-to-task spread, which dominates: with 20 held-out tasks one task moves pass@k by 0.05. There were no confidence intervals and no paired comparison. pass@k is the "any of the first k attempts" definition (`pass_k_definition` in results_build.json), not the unbiased estimator 1 - C(n-c, k)/C(n, k) of Chen et al. (2021), and the choice was not discussed.

**Fixed now (in the dashboard, labelled as added).**
- Unbiased pass@k next to the repo's first-k pass@k for every variant, seed and split.
- Percentile bootstrap over tasks (2,000 resamples, fixed seed) for mean attempt success.
- Paired bootstrap over tasks of `full` minus each variant.
- Unrounded per-seed counts (for example 177/180) so the "0.0 variance" cells are explained.
- `engine.check.mjs` asserts the paired point estimate equals the recorded difference in mean success for every variant and split.

**Remaining gap.** Move these estimators into the Python record so they are part of the repo's results, not only the page. Needs: a stdlib function in `eval_suite.py` and a test; seconds of CPU.

### 6. Reproducibility

Strong. All three runners are deterministic; the READMEs record output sha256 values; `test_deep*` compares the saved JSON to a fresh run.

**Fixed now.**
- CI step `git diff --exit-code` over the four results files after the runners, so committed results cannot drift silently (.github/workflows/ci.yml).
- An independent JavaScript re-implementation (`site/src/engine.js`) of `ConfigurableToyAgent.run`, `score_attempt`, `pass_at_k`, `mean_and_variance`, the Deep classifier and the hygiene fingerprint, including a port of CPython's `random.Random(str)` seeding. `site/src/engine.check.mjs` asserts it reproduces every cell of results_build.json and the Deep taxonomy counts (by variant and by set); it runs inside `npm run build` and in CI.

**Remaining gap.** The runs used the Muse VM, not the assigned fleet node (named as a limit in the Deep section above). Needs: one re-run of the three runners on BlackBoxV2 (under a minute of CPU) and a sha256 comparison.

### 7. Threats to validity

- Construct: a toy agent with three switches; results describe the simulator.
- Internal: effect sizes fixed by construction (section 2).
- External: held-out set is same-author and in-repo with one reused template (D16/H20 at Jaccard 0.8, results_deep.json). Hygiene proves only that there is no exact leakage inside the repo.
- Measurement: the near-duplicate threshold of 0.9 was a single fixed value.

**Fixed now.** `level-3-deep/hygiene_sensitivity.py` sweeps the threshold from 0.30 to 1.00 over all 320 cross-set pairs (results_hygiene_sensitivity.json): 63 pairs at 0.30 or above, 1 at 0.80, and 0 from 0.85 upward, so the "0 near duplicates" result holds for any threshold of 0.85 or more. It has its own tests and a CI step.

**Remaining gap.** An externally authored held-out set and a contamination check against a named public corpus. Needs: about 20 tasks written by a second person, and the corpus files (for example a public agent benchmark's task texts) with their version recorded.

### 8. Related work

The original scope and background contain no citations; the proposed novelty (PROPOSAL.md) is marked "DRAFT, PROPOSED" with "NO MEASUREMENT YET".

**Fixed now.** The dashboard's limits section names the comparison class as context only: pass@k and its unbiased estimator (Chen et al., 2021, "Evaluating Large Language Models Trained on Code"), and real-agent benchmarks SWE-bench (Jimenez et al., 2024), AgentBench (Liu et al., 2024), tau-bench (Yao et al., 2024) and Terminal-Bench (2025). No measured difference against them is claimed.

**Remaining gap.** A related-work section in this report with full references and a position statement. Needs: reading time only, no compute.

### 9. Limitations

The old level READMEs listed specific, self-assigned limits; they are kept in this report under each level's "Failure modes and limits". The v1.1 backlog (Future work, below) lists the main open items honestly.

### What this change did not do

- No new Python results were produced except the threshold sweep; every added estimator lives in the dashboard and is labelled.
- No paid API calls and no GPU work.
- The Pages source still has to be switched from the legacy `/docs` folder to GitHub Actions at ship time; `docs/index.md` stays in the repo.

## Future work

### v1.1 backlog (named remainder of the v2 Deep scope, not done)

- A real agent under test: evaluate an actual LLM-backed agent
  through an API or a local model, so the taxonomy classes
  describe real agent behaviour, not a toy agent.
- Loop-capable agent runs: an agent that can retry and replan,
  so loop_trap and excess_steps are reachable classes with a
  measurable count, plus step and cost budgets enforced by the
  harness.
- Richer tool misuse coverage: wrong tool selection, wrong
  argument values, and untrusted tool output cases, each as its
  own labelled task family.
- External held-out tasks: a task set authored outside this
  repo (third-party or newly written by another author), so the
  hygiene report checks independence, not only exact leakage.
- Contamination checks against an external corpus: n-gram and
  near-duplicate overlap of task texts against a named public
  benchmark corpus, with the corpus version recorded.
- Human adjudication sample: a hand-labelled sample of failed
  attempts, checked against the classifier output, with an
  agreement rate reported.
- Real cost accounting: token and money cost per attempt for a
  real model, replacing the fixed unit price list.
- Larger task base: grow dev and held-out sets so taxonomy
  shares rest on more distinct tasks, not seeded reruns.
- Fleet rerun: repeat the Deep sweep on the assigned fleet node
  BlackBoxV2 and record any difference.

## Conclusion

The harness does what an agent evaluation needs mechanically: logged
trajectories, dev and held-out kept apart and hashed, pass@k and seed
variance, one-at-a-time component ablations, a failure taxonomy whose
counts sum to the failure total, and hygiene checks computed in code,
all deterministic and regenerated in CI, with an independent
JavaScript replay. What it cannot do yet is say anything about real
agents: the agent is a rule-following toy, its effects are fixed by
construction, and no hypothesis was locked in advance. Those gaps are
the confirmatory re-run in PROPOSAL.md.
