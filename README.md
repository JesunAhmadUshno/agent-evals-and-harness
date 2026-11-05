# agent-evals-and-harness

Agent evaluation as its own project: trajectory evals, a private held-out task set, harness against model ablation, contamination hygiene.

Status: Learn DONE (2026-11-05). Build DONE (2026-11-05). Deep not started.
Project: P27. Fleet node: BlackBoxV2. Wave: Wave 6 (Learn pulled early, Sprint 3 pull, 2026-11-05).

## Start here

1. Read SPEC.md for scope and acceptance criteria.
2. Read DOSSIER.md for the past, present, and future of this problem (v1).
3. Read NOVELTY.md for the proposed novelty (DRAFT, pending the Jev claim_check gate).
4. Start at level-1-learn/README.md, then level-2-build, then level-3-deep.

## Level map

- Level 1, Learn: DONE (2026-11-05). Score one deterministic toy agent (not an LLM) on a fixed 12-task set: success rate, steps, cost per task, with trajectory logs. See level-1-learn/README.md.
- Level 2, Build: DONE (2026-11-05). An eval suite with a 16-task dev set and a 20-task held-out set (reported separately), pass@k and variance over 5 seeded master seeds, and a harness over five toy component ablation variants (planner, memory, verifier). These are toy component ablations, not model ablations. See level-2-build/README.md.
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

Build, measured 2026-11-05, Muse VM, Python 3.12, stdlib only. Method: level-2-build/run_build.py runs five configurable toy agent variants (component ablations, not model ablations) over 16 dev tasks plus 20 held-out tasks, 5 attempts per task under each of 5 master seeds, and writes level-2-build/results_build.json. Held-out success is reported separately, never merged silently. Held-out file sha256: 8b493427a00e893a642bc9318be889af22e690697b6e1ce9bf1a7de2781e0c4f.

| Variant | pass@1 | pass@3 | pass@5 | Mean success | Variance | Mean steps | Mean cost |
| --- | --- | --- | --- | --- | --- | --- | --- |
| full | 0.9889 | 1.0 | 1.0 | 0.98 | 0.0001 | 1.8911 | 2.8933 |
| no_planner | 0.4389 | 0.4444 | 0.4444 | 0.4411 | 0.0 | 1.1367 | 1.5511 |
| no_memory | 0.8667 | 0.8889 | 0.8889 | 0.8744 | 0.0001 | 1.8533 | 2.8733 |
| no_verifier | 0.85 | 0.9889 | 0.9944 | 0.8678 | 0.0004 | 1.7778 | 2.6667 |
| minimal | 0.4111 | 0.4444 | 0.4444 | 0.4089 | 0.0001 | 1.0 | 1.2778 |

| Split for full variant | Tasks | Mean success |
| --- | --- | --- |
| dev | 16 | 0.9775 |
| held-out | 20 | 0.982 |

Build unit tests: 24 new tests passing (45 unit tests total with Learn).

## Novelty

PROPOSED. See NOVELTY.md. The novelty text is a draft until the Jev claim_check gate passes on it.

## License

Code: Apache-2.0 (see LICENSE). Tutorials: CC BY 4.0. Ruled in D-V3-11, 2026-11-04.
