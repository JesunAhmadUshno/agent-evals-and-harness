# DOSSIER: agent-evals-and-harness (P27)

Updated to ship state at v1.0, 2026-11-05. Written under the
documentation and publishing standard (past, present, future).

## Past

Prior art for this project is named in NOVELTY.md (agent benchmark suites (Terminal-Bench class reports)). The history of the problem, the key papers and systems, and what was tried before are recorded in the Roadmap v2 section text in SPEC.md.

## Present

Shipped at v1.0 (2026-11-05), all three levels done:

- Learn (DONE, grade 8,700 of 10,000): one deterministic toy
  agent (not an LLM) scored on a fixed 12-task set: success
  rate, steps, cost per task, with trajectory logs.
- Build (DONE, grade 8,200 of 10,000): an eval suite with a
  16-task dev set and a 20-task held-out set reported
  separately, pass@k and variance over 5 master seeds, and a
  harness over five toy component ablation variants (planner,
  memory, verifier). These are toy component ablations, not
  model ablations. Full variant: pass@1 0.9889, mean attempt
  success 0.98; minimal variant: mean attempt success 0.4089.
- Deep, compressed (DONE, grade 7,750 of 10,000): a failure
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
  Full record: level-3-deep/README.md.

Tooling and versions, pinned at build time: Python 3.12,
standard library only, no external packages, no API calls.
Total unit tests at v1.0: 64, plus the scaffold smoke test.
All levels were run on the Muse VM, not the assigned fleet
node BlackBoxV2; that deduction is named in each level grade.

Current demand evidence: hiring value scored in the fleet pass (new candidates P23 to P29: see the decision pack Sections 4 and 5) [confirmed, fleet and scoring pass 2026-11-04; for P23 to P29, the decision pack 2026-11-04]. The Round 3 research (2026-11-04) found the market centre at post-training, evals, environments, and inference depth [confirmed as the research finding; the report is at ~/workspace/research_notes/roadmap-v3-revaluation-research-20261104-0949/report.md].

## Future

The v1.1 backlog is in ROADMAP.md: a real LLM-backed agent
under test, a loop-capable agent so loop_trap and excess_steps
become reachable, richer tool misuse families, external
held-out tasks, contamination checks against a named external
corpus, a human adjudication sample, real token and money cost
accounting, a larger task base, and a fleet rerun on BlackBoxV2.
Any forecast about this field is [unverified] unless a dated
primary source is added here.
