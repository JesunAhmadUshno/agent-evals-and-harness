# agent-evals-and-harness

Agent evaluation as its own project: trajectory evals, a private held-out task set, harness against model ablation, contamination hygiene.

Status: Learn DONE (2026-11-05). Build and Deep not started.
Project: P27. Fleet node: BlackBoxV2. Wave: Wave 6 (Learn pulled early, Sprint 3 pull, 2026-11-05).

## Start here

1. Read SPEC.md for scope and acceptance criteria.
2. Read DOSSIER.md for the past, present, and future of this problem (v1).
3. Read NOVELTY.md for the proposed novelty (DRAFT, pending the Jev claim_check gate).
4. Start at level-1-learn/README.md, then level-2-build, then level-3-deep.

## Level map

- Level 1, Learn: DONE (2026-11-05). Score one deterministic toy agent (not an LLM) on a fixed 12-task set: success rate, steps, cost per task, with trajectory logs. See level-1-learn/README.md.
- Level 2, Build: a real working system other people can run. Not started.
- Level 3, Deep: benchmarks, optimization, evaluation, hard cases. Not started.

## Benchmarks

Measured 2026-11-05, Muse VM, Python 3.12, stdlib only. Method: level-1-learn/run_learn.py scores the toy agent on the fixed 12-task set in level-1-learn/tasks_learn.json and writes level-1-learn/results_learn.json.

| Test | Result |
| --- | --- |
| Tasks | 12 (3 arithmetic, 3 lookup, 3 multi-step, 3 designed-failure) |
| Succeeded / failed | 9 / 3 (all 3 failures by design) |
| Success rate | 0.75 |
| Matches expected (answer or failure label) | 12 of 12, match rate 1.0 |
| Total steps / mean steps per task | 18 / 1.5 |
| Total cost units / mean cost per task | 27 / 2.25 (units, not money or tokens) |
| Trajectory entries | 18 |
| Unit tests | 21 passing, plus the scaffold smoke test |

## Novelty

PROPOSED. See NOVELTY.md. The novelty text is a draft until the Jev claim_check gate passes on it.

## License

Code: Apache-2.0 (see LICENSE). Tutorials: CC BY 4.0. Ruled in D-V3-11, 2026-11-04.
