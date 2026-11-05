# Tutorial: P27 agent-evals-and-harness, course module

Module: P27-agent-evals-and-harness
By Jesun Ahmad Ushno
Date: 2026-11-05
License for this tutorial: CC BY 4.0. Code in the repo: Apache-2.0.

## What you will do

You will clone the agent-evals-and-harness repo, run all three
levels, run the test suite for each level, and read your own
results against the recorded v1.0 numbers. Every command below
exists in the repo as shipped at v1.0 and was verified by running
it in this fan-out cycle. The harness needs Python 3.11 or 3.12
and uses the standard library only. No model, no API, and no
credential are needed.

Two scope facts govern every step. First, the agent under test
is a toy deterministic agent, NOT an LLM: it follows a written
tool plan and calls no API. Second, held-out in this repo means
unseen during development in this repo, NOT an external
benchmark. The held-out tasks were authored in this repo by the
same author as the agent.

## Step 0: Clone and enter the repo

```text
git clone https://github.com/JesunAhmadUshno/agent-evals-and-harness.git
cd agent-evals-and-harness
```

Optional smoke check, before the levels:

```text
python tests/test_smoke.py
```

Expected: a line that says the scaffold smoke test passed.

## Step 1: Level 1, Learn, score one agent with trajectories

Read level-1-learn/README.md first. It defines the 12-task set,
the four tools and their unit costs, and the match rule.

Run the Learn evaluator:

```text
python level-1-learn/run_learn.py
```

Run the Learn tests:

```text
python -m unittest tests.test_learn_agent_eval -v
```

Read your results:

- The runner prints one line per task and a summary line, and
  writes level-1-learn/results_learn.json.
- Expected summary on the shipped set: 9 succeeded, 3 failed of
  12 tasks, success rate 0.75, 12 of 12 matched, 18 total steps
  at mean 1.5, 27 total cost units at mean 2.25, and 18
  trajectory entries.
- The 3 failures are by design: F01 missing_knowledge, F02 and
  F03 division_by_zero. The evaluator should catch all three as
  failures with those labels, not as successes.
- Expected tests: 21 tests, all passing.
- Cost units are a fixed price list count (lookup 1, other tools
  2). They are not money and not tokens.

If your summary differs, open results_learn.json and check the
per-task trajectory first. Each entry shows the tool, the
resolved arguments, the result or error, and the cost.

## Step 2: Level 2, Build, pass at k and component ablations

Read level-2-build/README.md first. It defines pass at k, the
variance rule, the five variants, and the slip model. Remember:
the ablations are toy component ablations (planner, memory,
verifier), NOT model ablations, and held-out means unseen during
development in this repo, NOT an external benchmark.

Run the Build suite:

```text
python level-2-build/run_build.py
```

Run the Build tests:

```text
python -m unittest tests.test_build_eval_suite -v
```

Read your results:

- The runner prints one line per variant and writes
  level-2-build/results_build.json. It also prints the held-out
  file hash.
- Expected combined results (36 tasks, 16 dev plus 20
  held-out): full pass@1 0.9889, pass@3 1.0, pass@5 1.0, mean
  success 0.98; no_planner mean 0.4411; no_memory mean 0.8744;
  no_verifier mean 0.8678 with pass@1 0.85; minimal mean
  0.4089.
- Expected held-out hash line: 8b493427a00e893a642bc9318be889af22e690697b6e1ce9bf1a7de2781e0c4f.
  If this hash differs, the held-out set changed after v1.0.
- Expected split for the full variant: dev mean 0.9775 on 16
  tasks, held-out mean 0.982 on 20 tasks, reported separately.
- Expected tests: 24 Build tests, all passing (45 unit tests in
  total with Learn).
- Slips are simulated with seeded rates, not sampled from a real
  model. Treat the variance column as a property of the slip
  model, not of any model.

## Step 3: Level 3, Deep, failure taxonomy and hygiene

Read level-3-deep/README.md and level-3-deep/DEEP-SPEC.md
first. They define the six taxonomy classes, the precedence
order, and every hygiene check.

Run the Deep analysis:

```text
python level-3-deep/run_deep.py
```

Run the Deep tests:

```text
python -m unittest tests.test_deep_taxonomy_hygiene -v
```

Read your results:

- The runner prints the attempt totals, one line per taxonomy
  class, the taxonomy sum check, and the hygiene summary, and
  writes level-3-deep/results_deep.json.
- Expected totals: 4,500 attempts, 3,215 passed, 1,285 failed.
- Expected taxonomy: truncated_plan 1,000, silent_wrong_answer
  185, tool_misuse 100, loop_trap 0, excess_steps 0,
  other_wrong_answer 0. The sum must read 1,285 and match the
  failure total.
- Expected hygiene line: exact checks zero true, maximum
  Jaccard 0.8, pair D16 and H20. That pair is a disclosed near
  neighbour below the 0.9 near-duplicate threshold, not a hidden
  duplicate.
- Expected tests: 19 Deep tests, all passing (64 unit tests in
  total).
- Two classes are zero by construction in this toy agent: it
  cannot loop and cannot exceed its step bound. Do not read the
  zeros as proof that real agents avoid those failures.

## Step 4: Run the full suite the way CI does

Run every test and every runner in one pass:

```text
python -m unittest discover -s tests -v
python level-1-learn/run_learn.py
python level-2-build/run_build.py
python level-3-deep/run_deep.py
```

Expected: 64 unit tests pass, the scaffold smoke test passes,
and the three results files are unchanged after the runners
(the runners are deterministic; run one twice and compare the
file hash if you want to check this yourself).

## What to try next

- Read one failed trajectory in results_learn.json and name the
  step where the failure label was set.
- In results_build.json, compare no_verifier pass@1 with its
  pass@5 and explain the gap using the slip model in the Build
  README.
- In results_deep.json, verify by hand that the six taxonomy
  counts sum to 1,285, then check the hand counts in the Deep
  README for truncated_plan and tool_misuse.
- The v1.1 backlog in ROADMAP.md names what this tutorial does
  not cover: a real LLM-backed agent, external held-out tasks,
  and real cost accounting. None of that is shipped at v1.0.
