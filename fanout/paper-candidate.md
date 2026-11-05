# Paper candidate brief: failure taxonomy and contamination hygiene for agent evals

Project: P27 agent-evals-and-harness
Status: CANDIDATE, brief dated 2026-11-05
Submission note: submission is Jesun's tap. Nothing is submitted by
this brief, and no venue has been contacted.

## Working title

One primary class per failure: a failure taxonomy and a code-computed
contamination hygiene note for a small agent evaluation suite

## Candidate claim, in one line

On a small, fully reproducible suite, classifying every failed
attempt into exactly one primary class (so counts sum to the
failure total) plus computing contamination checks in code gives
a failure record that a single pass rate cannot give. The evidence
here is a toy deterministic agent, NOT an LLM, and held-out means
unseen during development in this repo, NOT an external benchmark.

## Abstract draft

Based only on the measured v1.0 results recorded in the repo.
Scope limits are stated inside the abstract, not after it.

Agent evaluation often reports a pass rate and stops. That hides
the repair target: different failure mechanisms need different
fixes. This candidate presents two linked artefacts from an open,
standard-library-only evaluation suite. First, a failure taxonomy
with operational rules and a precedence order, applied to real
runs of the suite: the runner re-ran a configurable toy agent
(NOT an LLM) attempt by attempt over 36 tasks (16 dev plus 20
held-out, where held-out means unseen during development in this
repo, NOT an external benchmark), 5 attempts per task under each
of 5 master seeds, for 4,500 attempts in total, with 3,215 passed
and 1,285 failed. Every failed attempt was classified into
exactly one primary class: truncated_plan 1,000 (77.82 percent of
failures), silent_wrong_answer 185, tool_misuse 100, loop_trap 0,
excess_steps 0, and other_wrong_answer 0, and the counts sum to
the failure total. Second, a contamination hygiene note computed
in code over the same sets: 320 cross-set pairs compared, 0 exact
fingerprint overlaps, 0 exact plan overlaps, 0 duplicates across
all 36 task texts, 0 held-out answers in the toy agent code, a
behavioural mutation check at 20 of 20 runs unchanged, and one
near neighbour pair disclosed (D16 and H20, Jaccard 0.8, below
the 0.9 near-duplicate threshold). Context results from the same
suite: the full variant reached pass@1 0.9889, pass@3 1.000, and
pass@5 1.000 with mean attempt success 0.980, against 0.4411
without the planner, 0.8744 without memory, 0.8678 without the
verifier, and 0.4089 with all components off. The suite ships
with 64 unit tests. The agent is a toy, the stochasticity is a
seeded slip model, two taxonomy classes are unreachable by
construction in this toy, and the held-out set is same-author and
in-repo; the candidate claims the taxonomy discipline and the
hygiene method on these sets, not real agent performance.

## Method outline

1. Suite. A configurable toy agent (NOT an LLM) with three
   switchable components: planner, memory, verifier. Five
   variants: full, no_planner, no_memory, no_verifier, minimal.
   Toy component ablations, NOT model ablations.
2. Task sets. Dev: 16 tasks. Held-out: 20 tasks, unseen during
   development in this repo, NOT an external benchmark. The
   held-out file hash is committed in the results so later
   changes are detectable (sha256
   8b493427a00e893a642bc9318be889af22e690697b6e1ce9bf1a7de2781e0c4f).
   Scoring keys live only in the task files and are read only by
   the scorer.
3. Repeated trials. 5 attempts per task under each of 5 master
   seeds (11, 22, 33, 44, 55). Pass at k: a task passes at k if
   any of its first k attempts passes; reported as the mean over
   seeds of the per-seed fraction passing at k.
4. Taxonomy. Six primary classes with operational signals read
   from the run record and trajectory, never from the expected
   answer, applied in a fixed precedence order: loop_trap,
   excess_steps, truncated_plan, tool_misuse,
   silent_wrong_answer, other_wrong_answer. One class per failed
   attempt, so the counts sum to the failure total. Hand counts
   in the Deep README verify truncated_plan (20 multi-step tasks
   times 2 planner-off variants times 25 attempts = 1,000) and
   tool_misuse (4 recall tasks times 25 attempts = 100)
   independently of the classifier.
5. Hygiene. All checks computed in code: cross-set fingerprint
   and plan overlap, Jaccard near-duplicate scan at 0.9 with near
   neighbours at 0.8 disclosed, duplicate scans inside and across
   sets, agent-code scanning scoped to the agent class segment,
   a behavioural mutation check (mutate scoring keys, confirm
   held-out runs are unchanged), and file hash checks against
   the Build record.
6. Determinism. Every runner writes its results file with no
   timestamps. Re-running reproduces the file byte for byte;
   hashes are recorded in the level READMEs.

## Results table

Measured 2026-11-05, Muse VM, Python 3.12, from the level
READMEs and results files in the repo. Toy deterministic agent,
NOT an LLM, at every row.

| Item | Result |
| --- | --- |
| Learn | 12 tasks, 9 succeeded, 3 failed by design, success 0.75, 12 of 12 matched |
| Build, full variant (36 tasks) | pass@1 0.9889, pass@3 1.000, pass@5 1.000, mean 0.980 |
| Build, ablations (mean success) | no_planner 0.4411, no_memory 0.8744, no_verifier 0.8678, minimal 0.4089 |
| Build, full split | dev mean 0.9775 (16 tasks), held-out mean 0.982 (20 tasks) |
| Deep attempts | 4,500 total, 3,215 passed, 1,285 failed |
| Taxonomy | truncated_plan 1,000, silent_wrong_answer 185, tool_misuse 100, loop_trap 0, excess_steps 0, other_wrong_answer 0 |
| Hygiene | 320 pairs, 0 exact overlaps, 0 duplicates, 0 held-out answers in agent code, 1 near neighbour at 0.8 disclosed, mutation check 20 of 20 |
| Tests | 64 unit tests, plus the scaffold smoke test |

## Limits a reviewer will raise, stated first

- Toy agent. Every number describes a toy deterministic agent,
  NOT an LLM. No claim transfers to real agents or models.
- Same-author held-out. Held-out means unseen during
  development in this repo, NOT an external benchmark. Author
  independence is not established and is v1.1 scope.
- Simulated slips. Slip and verifier catch rates are invented
  constants of the test harness, not measured model behaviour.
- Unreachable classes. loop_trap and excess_steps are zero by
  construction in an agent that cannot loop. A loop-capable
  agent is required before those classes carry evidence.
- Small base. 36 distinct tasks; the 4,500 attempts are seeded
  reruns of those tasks.
- Single site. All runs are on one machine (the Muse VM), not
  the assigned fleet node. A fleet rerun is in the v1.1 backlog.

## What would strengthen the candidate

Each item below is v1.1 backlog in ROADMAP.md, not done work:
a real LLM-backed agent under the same taxonomy, a loop-capable
agent so all six classes are reachable, external held-out tasks,
hygiene checks against a named external corpus, and a human
adjudication sample with an agreement rate against the
classifier.

## Venue note

No venue is named as submitted or contacted. Venue choice and
any submission click are Jesun's tap only.
