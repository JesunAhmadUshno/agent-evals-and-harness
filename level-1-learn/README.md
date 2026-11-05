# Level 1, Learn: agent-evals-and-harness

Status: DONE (2026-11-05). An evaluator that scores one agent on a
fixed task set: success rate, steps, cost per task, with trajectory
logs, built with the Python standard library only.

Note: this project is agent evaluation. It is distinct from P06
rag-eval-harness, which evaluates retrieval and answers for RAG.
Here the unit under test is an agent trajectory: the ordered tool
calls an agent makes on a task.

## Honest scope line

The agent in this level is a deterministic toy agent. It is not
an LLM, it is not a real agent, it calls no API, and it does not
learn. It follows the tool plan written in each task, resolving
placeholders that refer to earlier tool results. No claim is made
about real agent quality, real model behaviour, or any external
benchmark. Real models and a held-out set are Build level scope.

## Method

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

## The scenario

The 9 non-failure tasks succeed: 3 arithmetic, 3 lookup, and 3
multi-step tasks that chain lookup results into arithmetic. The
3 designed-failure tasks fail by design: F01 looks up a key that
does not exist (failure label missing_knowledge), F02 divides by
zero directly, and F03 divides by a zero value returned by a
lookup (both failure label division_by_zero). The evaluator is
expected to catch all three as failures, not as successes.

## Run it

    python level-1-learn/run_learn.py
    python -m unittest tests.test_learn_agent_eval -v
    python tests/test_smoke.py

The runner writes level-1-learn/results_learn.json deterministically:
run it twice and the file is identical (verified 2026-11-05:
sha256 941305d2dcdeb53c5c74a89814448b71206d66c62ed7340ee1ee007a1cbf6d2b
on both runs).

## Results (measured 2026-11-05, Muse VM, Python 3.12)

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

## Failure modes and limits

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
  BlackBoxV2. That costs a grade deduction, named in the grade.

## Grade

Grade: 8,700 of 10,000 for this Learn level.

Deductions (they sum to 1,300):
- Deterministic toy agent, not an LLM or a real agent, following
  a written plan with no planning or tool choice: minus 400.
- Small synthetic task set: 12 tasks, same author as the
  evaluator, no held-out or external tasks: minus 500.
- Cost is a unit count on a fixed price list, not money, not
  tokens, and no real model or API price is measured: minus 200.
- Run on the Muse VM, not the assigned BlackBoxV2 fleet node:
  minus 200.

## What Build adds next

An eval suite with a private held-out task set, pass@k and
variance over repeated trials, and a harness against model
ablation table, per the SPEC. See the root README level map.
